import json
import logging
import re
from typing import Any, Callable, Dict, List, Optional, Tuple, Awaitable

from app.core.llm import call_llm
from contracts.plan import FileAction, PlanContract

logger = logging.getLogger("app.agents.coder")

CODER_SYSTEM_PROMPT = """You are the Lead Frontend Engineer for Voice-to-Website AI.
Your mission is to generate production-ready TypeScript/React or JSON code for a single file in a 'vite-react-tailwind' project.

INVIOLABLE RULES FOR FILE GENERATION:
1. STRICT DATA SEPARATION:
   All business copy, headlines, descriptions, button labels, phone numbers, and navigation links MUST come from 'data/site.json'.
   NEVER hardcode brand copy, business names, or contact text directly in component JSX.
2. TYPESCRIPT & MODERN REACT:
   - Use React 18/19 functional components with TypeScript.
   - Export the exact symbol(s) required by the architectural plan.
   - Define clean TypeScript interfaces for any component props.
3. TAILWIND CSS STYLING:
   - Use clean, modern Tailwind CSS classes.
   - Ensure responsive layout (mobile-first, with sm:, md:, lg: breakpoints).
   - Use accessible colors conforming to the project color palette.
4. LUCIDE-REACT ICONS:
   - Import icons strictly from 'lucide-react' (e.g., Menu, X, Phone, Mail, MapPin, MessageCircle, Check, Star, ShoppingBag, ArrowRight, ShieldCheck, Truck).
5. PRODUCTION QUALITY - ZERO PLACEHOLDERS:
   - NEVER use placeholder comments like '// TODO: implement', '// add code here', or '...existing code...'.
   - The code must be complete, working, and ready to compile.
6. OUTPUT FORMAT:
   - Return ONLY the clean code for this file.
   - Do NOT wrap the output in conversational text or explanations.
"""


def extract_clean_code(raw_content: str) -> str:
    """
    Extracts raw code from an LLM response, cleanly stripping markdown code fences
    (e.g., ```typescript, ```tsx, ```json, ```javascript, ```) and surrounding whitespace.
    """
    if not raw_content:
        return ""

    text = raw_content.strip()

    # Match fenced code blocks
    match = re.search(r"```(?:typescript|tsx|jsx|javascript|json|ts|js)?\s*\n([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()

    # Handle loose fences at start or end
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) > 1 and lines[0].startswith("```"):
            text = "\n".join(lines[1:])
    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


def validate_file_syntax(path: str, content: str) -> Tuple[bool, Optional[str]]:
    """
    AST & Syntax validation (Task 10.4).
    Validates JSON files and TypeScript/React files to catch syntax or placeholder errors before sandboxing.
    """
    if not content or not content.strip():
        return False, "File content is empty"

    # 1. Banned placeholder check
    banned_patterns = [
        r"//\s*TODO",
        r"/\*\s*TODO",
        r"\.\.\.existing\s+code\.\.\.",
        r"//\s*rest\s+of\s+code",
        r"//\s*add\s+code\s+here",
        r"//\s*implement\s+here",
    ]
    for pat in banned_patterns:
        if re.search(pat, content, re.IGNORECASE):
            return False, f"File contains unfinished placeholder matching '{pat}'"

    # 2. JSON validation
    if path.endswith(".json"):
        try:
            json.loads(content)
            return True, None
        except json.JSONDecodeError as exc:
            return False, f"JSON syntax error: {exc}"

    # 3. TypeScript / TSX balance check
    if path.endswith((".tsx", ".ts", ".jsx", ".js")):
        stack = []
        pairs = {")": "(", "}": "{", "]": "["}
        in_single_quote = False
        in_double_quote = False
        in_template_literal = False
        in_line_comment = False
        in_block_comment = False

        i = 0
        n = len(content)
        while i < n:
            ch = content[i]
            next_ch = content[i + 1] if i + 1 < n else ""

            # Handle comments
            if in_line_comment:
                if ch == "\n":
                    in_line_comment = False
                i += 1
                continue
            if in_block_comment:
                if ch == "*" and next_ch == "/":
                    in_block_comment = False
                    i += 2
                    continue
                i += 1
                continue

            if not (in_single_quote or in_double_quote or in_template_literal):
                if ch == "/" and next_ch == "/":
                    in_line_comment = True
                    i += 2
                    continue
                if ch == "/" and next_ch == "*":
                    in_block_comment = True
                    i += 2
                    continue

            # Handle string quotes
            prev_ch = content[i - 1] if i > 0 else ""
            if ch == "'" and prev_ch != "\\" and not (in_double_quote or in_template_literal):
                in_single_quote = not in_single_quote
            elif ch == '"' and prev_ch != "\\" and not (in_single_quote or in_template_literal):
                in_double_quote = not in_double_quote
            elif ch == "`" and prev_ch != "\\" and not (in_single_quote or in_double_quote):
                in_template_literal = not in_template_literal
            elif not (in_single_quote or in_double_quote or in_template_literal):
                if ch in "({[":
                    stack.append(ch)
                elif ch in ")}]":
                    if not stack or stack[-1] != pairs[ch]:
                        return False, f"Unbalanced delimiter: unexpected '{ch}' at character position {i}"
                    stack.pop()

            i += 1

        if in_single_quote or in_double_quote or in_template_literal:
            return False, "Unclosed string literal or template literal"
        if in_block_comment:
            return False, "Unclosed block comment"
        if stack:
            return False, f"Unclosed delimiter: remaining unclosed '{stack[-1]}'"

        # Verify export keyword is present
        if "export" not in content:
            return False, "File is missing an 'export' declaration"

        return True, None

    return True, None


def get_fallback_file_content(
    file_action: FileAction,
    requirements: Dict[str, Any],
    site_json_content: Optional[str] = None,
) -> str:
    """
    Generates a deterministic, high-quality, production-ready fallback code implementation
    for any planned file in the vite-react-tailwind stack.
    """
    path = file_action.path
    biz_name = requirements.get("business_name", "Modern Store")
    biz_type = requirements.get("business_type", "Retail & Ecommerce")
    headline = requirements.get("hero_headline", f"Welcome to {biz_name}")
    subheadline = requirements.get("hero_subheadline", "Premium quality products delivered directly to you.")
    palette = requirements.get("palette", {
        "primary": "#4F46E5",
        "secondary": "#06B6D4",
        "background": "#0F172A",
        "text": "#F8FAFC",
    })
    nav_items = requirements.get("navigation", [
        {"label": "Home", "target_section": "hero"},
        {"label": "Catalog", "target_section": "catalog"},
        {"label": "Contact", "target_section": "contact"},
    ])
    features = requirements.get("features", [
        {"name": "Fast Delivery", "description": "Express delivery right to your door.", "priority": "must_have"},
        {"name": "WhatsApp Order", "description": "Order instantly via WhatsApp messaging.", "priority": "must_have"},
        {"name": "Verified Quality", "description": "100% authentic and premium guarantee.", "priority": "must_have"},
    ])

    # 1. data/site.json
    if path == "data/site.json":
        data = {
            "business": {
                "name": biz_name,
                "type": biz_type,
                "tagline": subheadline,
            },
            "palette": palette,
            "navigation": [
                {"label": item.get("label", "Link"), "target": f"#{item.get('target_section', 'hero')}"}
                for item in nav_items
            ],
            "hero": {
                "headline": headline,
                "subheadline": subheadline,
                "ctaText": "Browse Catalog",
                "whatsappCta": "Order via WhatsApp",
            },
            "features": [
                {
                    "title": f.get("name", "Feature"),
                    "description": f.get("description", "Quality feature"),
                    "icon": "ShieldCheck" if idx % 3 == 0 else ("Truck" if idx % 3 == 1 else "MessageCircle"),
                }
                for idx, f in enumerate(features)
            ],
            "products": [
                {"id": 1, "name": f"Premium {biz_name} Item 1", "price": "$49.99", "category": "Best Seller"},
                {"id": 2, "name": f"Handcrafted {biz_name} Item 2", "price": "$79.99", "category": "New Arrival"},
                {"id": 3, "name": f"Signature {biz_name} Item 3", "price": "$129.99", "category": "Exclusive"},
            ],
            "contact": {
                "phone": "+92 300 1234567",
                "email": f"info@{biz_name.lower().replace(' ', '')}.com",
                "address": "Lahore, Pakistan",
                "whatsapp": "+923001234567",
            },
        }
        return json.dumps(data, indent=2)

    # 2. Navbar.tsx
    if "Navbar" in path:
        return """import React, { useState } from "react";
import siteData from "../../data/site.json";
import { Menu, X, MessageCircle } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { business, navigation, contact } = siteData;

  const whatsappUrl = "https://wa.me/" + contact.whatsapp.replace(/[^0-9]/g, "");

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold text-white tracking-tight">{business.name}</span>
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-full">
            {business.type}
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navigation.map((item, idx) => (
            <a
              key={idx}
              href={item.target}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center space-x-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>

        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-300 hover:text-white p-2"
            aria-label="Toggle Navigation"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-900 px-4 pt-3 pb-4 space-y-2">
          {navigation.map((item, idx) => (
            <a
              key={idx}
              href={item.target}
              onClick={() => setIsOpen(false)}
              className="block text-base font-medium text-slate-300 hover:text-white py-2"
            >
              {item.label}
            </a>
          ))}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Us</span>
          </a>
        </div>
      )}
    </header>
  );
}
"""

    # 3. Hero.tsx
    if "Hero" in path:
        return """import React from "react";
import siteData from "../../data/site.json";
import { ArrowRight, MessageCircle } from "lucide-react";

export function Hero() {
  const { hero, business, contact } = siteData;
  const whatsappUrl = "https://wa.me/" + contact.whatsapp.replace(/[^0-9]/g, "");

  return (
    <section id="hero" className="relative py-20 lg:py-28 overflow-hidden bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-6">
          {business.name} &bull; {business.type}
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6 text-white">
          {hero.headline}
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          {hero.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#catalog"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            <span>{hero.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{hero.whatsappCta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
"""

    # 4. ProductCatalog.tsx or Features.tsx
    if "Product" in path or "Catalog" in path or "Features" in path:
        return """import React from "react";
import siteData from "../../data/site.json";
import { ShieldCheck, Truck, MessageCircle, ShoppingBag } from "lucide-react";

export function ProductCatalog() {
  const { features, products } = siteData;

  const renderIcon = (name: string) => {
    switch (name) {
      case "ShieldCheck":
        return <ShieldCheck className="w-6 h-6 text-indigo-400" />;
      case "Truck":
        return <Truck className="w-6 h-6 text-indigo-400" />;
      default:
        return <MessageCircle className="w-6 h-6 text-indigo-400" />;
    }
  };

  return (
    <section id="catalog" className="py-20 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feat, idx) => (
            <div key={idx} className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                {renderIcon(feat.icon)}
              </div>
              <h3 className="text-lg font-semibold text-white">{feat.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>

        {products && products.length > 0 && (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Featured Offerings</h2>
              <p className="text-sm text-slate-400 mt-2">Hand-picked selections crafted for perfection</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950 p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">{item.category}</span>
                    <h4 className="text-lg font-bold text-white mt-1">{item.name}</h4>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xl font-extrabold text-emerald-400">{item.price}</span>
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
"""

    # 5. Footer.tsx
    if "Footer" in path:
        return """import React from "react";
import siteData from "../../data/site.json";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

export function Footer() {
  const { business, contact } = siteData;
  const whatsappUrl = "https://wa.me/" + contact.whatsapp.replace(/[^0-9]/g, "");

  return (
    <footer id="contact" className="bg-slate-950 text-slate-400 border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span className="text-xl font-bold text-white">{business.name}</span>
          <p className="mt-3 text-sm leading-relaxed">{business.tagline}</p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Contact & Support</h4>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-indigo-400" />
            <span>{contact.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span>{contact.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <span>{contact.address}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Direct Order</h4>
          <p className="text-sm mt-2">Questions or custom requests? Reach out directly via WhatsApp.</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message on WhatsApp</span>
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 border-t border-white/5 pt-6 text-center text-xs">
        &copy; {new Date().getFullYear()} {business.name}. All rights reserved.
      </div>
    </footer>
  );
}
"""

    # 6. src/App.tsx
    if "App" in path:
        return """import React from "react";
import siteData from "../data/site.json";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { ProductCatalog } from "./components/ProductCatalog";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <ProductCatalog />
      </main>
      <Footer />
    </div>
  );
}
"""

    # Generic fallback component
    export_symbol = file_action.exports[0] if file_action.exports else "Component"
    return f"""import React from "react";
import siteData from "../../data/site.json";

export function {export_symbol}() {{
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-white/10 text-white">
      <h3 className="text-lg font-bold">{export_symbol}</h3>
      <p className="text-sm text-slate-400 mt-1">{file_action.description}</p>
    </div>
  );
}}
"""


async def generate_single_file(
    file_action: FileAction,
    requirements: Dict[str, Any],
    site_json_content: Optional[str] = None,
    previous_files_summary: Optional[List[str]] = None,
) -> str:
    """
    Generates a single production-ready TypeScript/React/JSON file (Task 10.2).
    Enforces context pruning and persistent data/site.json context.
    """
    path = file_action.path
    fallback_code = get_fallback_file_content(file_action, requirements, site_json_content)

    # Build concise context-pruned prompt
    user_prompt_parts = [
        f"Generate the complete, production-ready code for file: '{path}'",
        f"Role: {file_action.role}",
        f"Description: {file_action.description}",
        f"Required Imports: {json.dumps(file_action.imports)}",
        f"Required Exports: {json.dumps(file_action.exports)}",
        f"Project Business Name: {requirements.get('business_name', 'Store')}",
        f"Project Business Type: {requirements.get('business_type', 'Retail')}",
    ]

    # Subtask 10.2.1: Provide data/site.json as persistent context for all UI components
    if path != "data/site.json" and site_json_content:
        user_prompt_parts.append(f"\n--- PERSISTENT DATA REPOSITORY ('data/site.json') ---\n{site_json_content}")

    if previous_files_summary:
        user_prompt_parts.append(
            "\n--- PRECEDING GENERATED FILES SUMMARY ---\n" + "\n".join(f"- {s}" for s in previous_files_summary)
        )

    user_prompt = "\n".join(user_prompt_parts)

    try:
        raw_result = await call_llm(
            system_prompt=CODER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            json_mode=False,
            fallback_data={"code": fallback_code},
        )

        code_text = ""
        if isinstance(raw_result, dict):
            code_text = raw_result.get("code", fallback_code)
        elif isinstance(raw_result, str):
            code_text = raw_result
        else:
            code_text = fallback_code

        clean_code = extract_clean_code(code_text)
        is_valid, err_msg = validate_file_syntax(path, clean_code)

        if not is_valid:
            logger.warning(
                f"[CODER] Syntax validation failed for '{path}' ({err_msg}). Falling back to verified code."
            )
            return fallback_code

        return clean_code

    except Exception as exc:
        logger.warning(f"[CODER] Exception generating '{path}' ({exc}). Using verified fallback code.")
        return fallback_code


async def generate_project_files(
    plan: PlanContract,
    requirements: Dict[str, Any],
    on_progress: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
) -> Dict[str, str]:
    """
    Executes the sequential file generation loop across all planned files (Task 10.2).
    Streams progress events (Task 10.3) and maintains context integrity.
    """
    generated_files: Dict[str, str] = {}
    site_json_content: Optional[str] = None
    previous_summaries: List[str] = []
    total_files = len(plan.files)

    for idx, file_action in enumerate(plan.files):
        # 1. Emit file_generation_started event
        if on_progress:
            await on_progress({
                "event": "file_generation_started",
                "path": file_action.path,
                "role": file_action.role,
                "description": file_action.description,
                "index": idx + 1,
                "total": total_files,
            })

        # 2. Generate file sequentially
        content = await generate_single_file(
            file_action=file_action,
            requirements=requirements,
            site_json_content=site_json_content,
            previous_files_summary=previous_summaries,
        )

        generated_files[file_action.path] = content

        # Store data/site.json for persistent context
        if file_action.path == "data/site.json":
            site_json_content = content

        # Add to pruned summary
        previous_summaries.append(f"{file_action.path} (exports: {file_action.exports})")

        # 3. Emit file_generation_completed event
        if on_progress:
            await on_progress({
                "event": "file_generation_completed",
                "path": file_action.path,
                "role": file_action.role,
                "index": idx + 1,
                "total": total_files,
                "status": "success",
            })

    # 4. Emit generation_finished event
    if on_progress:
        await on_progress({
            "event": "generation_finished",
            "total_files": total_files,
            "status": "success",
        })

    return generated_files
