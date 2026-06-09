import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Copy, RotateCcw, Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = "한국어 중심" | "English main" | "입력 언어 맞춤";
type SlideTheme = "light" | "dark" | "accent";
type SlideRole = "표지" | "도입" | "본론" | "요약" | "없음";

interface SlideContent {
  role: SlideRole;
  layout: string; // "auto" | "S01"..."S22"
  theme: SlideTheme;
  content: string;
}

interface State {
  title: string;
  target: string;
  coreMessage: string;
  language: Language;
  slideCount: number | "other";
  customSlideCount: string;
  defaultTheme: SlideTheme;
  slides: SlideContent[];
  authorName: string;
  company: string;
  date: string;
  contact: string;
  cta: string;
  additionalInstructions: string;
}

// ─── Layout registry ──────────────────────────────────────────────────────────

const LAYOUTS = [
  { id: "S01", name: "Index Cover", desc: "덱/섹션 오프너. 굵고 여백 많고 구조적." },
  { id: "S02", name: "Vertical Timeline + KPI", desc: "시간 흐름 + 실제 수치 신호." },
  { id: "S03", name: "Split Statement", desc: "테제·챕터 선언·강한 주장. 좌: 큰 아이디어, 우: 짧은 설명." },
  { id: "S04", name: "Six Cells", desc: "정확히 6개 동급 아이템." },
  { id: "S05", name: "Three Layers", desc: "3단계·3레이어·3개 동급 아이디어." },
  { id: "S06", name: "KPI Tower", desc: "4개 정량 지표 바 차트 비교." },
  { id: "S07", name: "Horizontal Bar", desc: "5–10개 순위/비율 값." },
  { id: "S08", name: "Duo Compare", desc: "Before/After · Old/New · A vs B." },
  { id: "S09", name: "Dot Matrix Statement", desc: "압축된 주장 한 줄. 시각적 쉬어가기." },
  { id: "S10", name: "Split Closing", desc: "덱 끝 한 번만. 최종 선언 + 테이크어웨이." },
  { id: "S11", name: "Horizontal Timeline", desc: "4–7단계 선형 프로세스." },
  { id: "S12", name: "Manifesto + Ink Banner", desc: "섹션 마무리·중반 강한 결론." },
  { id: "S13", name: "Three Forces", desc: "정확히 3개 풍부한 동급 아이디어." },
  { id: "S14", name: "Loop Form", desc: "피드백 루프·자동화 루프·반복 사이클." },
  { id: "S15", name: "Matrix + Hero Stat", desc: "8–12개 동급 아이템 + 합계 지표." },
  { id: "S16", name: "Multi-card Brief", desc: "정확히 6개 간결한 노트·팁." },
  { id: "S17", name: "System Diagram", desc: "3레이어 시스템/에코시스템/아키텍처." },
  { id: "S18", name: "Why Now", desc: "3가지 이유 — 각각 수치나 근거 필요." },
  { id: "S19", name: "Four Cards", desc: "정확히 4개 동등한 피처/모듈." },
  { id: "S20", name: "Stacked KPI Ledger", desc: "4–6개 핵심 지표 원장 형식." },
  { id: "S21", name: "Tech Spec Sheet", desc: "제품 스펙·벤치마크·기술 근거." },
  { id: "S22", name: "Image Hero", desc: "대형 비주얼 1개 + 3개 지원 지표." },
];

const SLIDE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

const SLIDE_ROLE_LABELS: Record<SlideRole, string> = {
  표지: "표지 Cover",
  도입: "도입 Intro",
  본론: "본론 Body",
  요약: "요약 Closing",
  없음: "없음 none",
};

const DEFAULT_ROLE_BY_INDEX: SlideRole[] = ["표지", "도입", "본론", "본론", "본론", "요약"];
const DEFAULT_THEME_BY_INDEX: SlideTheme[] = ["dark", "light", "light", "light", "light", "dark"];

function buildDefaultSlides(count: number, defaultTheme: SlideTheme): SlideContent[] {
  return Array.from({ length: count }, (_, i) => ({
    role: DEFAULT_ROLE_BY_INDEX[i] ?? "본론",
    layout: "auto",
    theme: DEFAULT_THEME_BY_INDEX[i] ?? defaultTheme,
    content: "",
  }));
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildHtmlPrompt(s: State): string {
  const count = s.slideCount === "other" ? parseInt(s.customSlideCount) || 6 : s.slideCount;

  const languageRule =
    s.language === "한국어 중심"
      ? "Korean for all body copy. Use English for labels, catchphrases, metrics, product terms, and key business keywords."
      : s.language === "English main"
        ? "English for all body copy. Korean allowed for supplementary descriptions."
        : "Match the primary language to the slide content. Mix English keywords naturally where they improve clarity.";

  const slideStructure = s.slides
    .slice(0, count)
    .map((sl, i) => {
      const roleLabel =
        sl.role === "표지" ? "Cover" :
        sl.role === "도입" ? "Intro" :
        sl.role === "본론" ? "Body" :
        sl.role === "요약" ? "Closing" : "(skip)";
      const layoutNote = sl.layout === "auto" ? "auto-select best layout" : sl.layout;
      const themeNote = sl.theme === "light" ? "" : `, .${sl.theme}`;
      const content = sl.content.trim() || "Generate content automatically based on the deck theme.";
      return `${i + 1}. ${roleLabel} (${layoutNote}${themeNote}): ${content}`;
    })
    .join("\n");

  const creditLines: string[] = [];
  const slide1Credits = [
    s.authorName.trim() ? `Presenter: "${s.authorName.trim()}"` : "",
    s.company.trim() ? `Affiliation: "${s.company.trim()}"` : "",
    s.date.trim() ? `Date: "${s.date.trim()}"` : "",
  ].filter(Boolean).join(", ");
  if (slide1Credits) {
    creditLines.push(`- Place ${slide1Credits} in the chrome bar or footer of slide 1.`);
  }
  if (s.contact.trim()) {
    creditLines.push(`- Place "${s.contact.trim()}" in the footer (.foot) of the final slide.`);
  }
  if (s.cta.trim()) {
    creditLines.push(`- Place "${s.cta.trim()}" as a call-to-action on the final slide. Use text and accent color naturally — not a button UI.`);
  }

  const parts: string[] = [
    "You are an expert HTML developer working with the Blux slide design system.",
    `Your task is to write <section class="slide"> HTML blocks for a ${count}-slide deck.`,
    "These sections will be pasted directly inside the existing <div id=\"deck\"> in blux-slide-design/index.html.",
    "",
    "[Design System Constraints — already defined in CSS, do not rewrite]",
    "- Canvas: 1920×1080px fixed. No responsive styles.",
    "- Color tokens: --paper #F7F9FB · --ink #0A192F · --accent #006FFD · --accent-bright #5BA3FF",
    "- Typography: Urbane (display/hero, font-family: var(--display)) + Pretendard Variable (body/UI, var(--sans))",
    "- No gradients, no box-shadow, no border-radius on cards, no glass effects.",
    "- letter-spacing: 0 globally. Exception: .chrome-min, .foot → letter-spacing: 0.1em.",
    "- Slide themes: default (.slide) = light paper bg | .slide.dark = navy bg | .slide.accent = blue bg",
    "",
    "[Output Format]",
    "- Output ONLY the <section class=\"slide ...\"> blocks, nothing else.",
    "- Do NOT rewrite boilerplate HTML, <head>, CSS, or JavaScript.",
    `- Number of slides: ${count}`,
    "- Every <section> must have data-layout=\"Sxx\" and class=\"slide\" (+ .dark or .accent if needed).",
    "",
    "[Deck Info]",
    `- Title: "${s.title.trim() || "(untitled)"}"`,
    ...(s.target.trim() ? [`- Target audience: ${s.target.trim()}`] : []),
    ...(s.coreMessage.trim() ? [`- Core message: ${s.coreMessage.trim()}`] : []),
    `- Language rule: ${languageRule}`,
    "",
    "[Typography Classes]",
    "- .h-hero  — Urbane weight 200, ~200px. Cover/opener hero only.",
    "- .h-statement — Urbane weight 600, ~120px. Split statement (S03, S09, S10) only.",
    "- .h-md   — Urbane weight 300, 88px. Body slide main title.",
    "- .lead   — Pretendard weight 300, 32–40px. Subcopy under the title.",
    "- .t-cat  — Pretendard weight 500, uppercase, 0.1em spacing. Section label / kicker above title.",
    "- .body-sm — Pretendard weight 300, 24–28px. Card body copy.",
    "- .foot   — Pretendard, uppercase, 21px, 0.1em. Footer bar.",
    "- .chrome-min — Top bar with left label + right page indicator.",
    "",
    "[Layout Selection Guide — pick the best match per slide]",
    "S01 Index Cover · S02 Vertical Timeline+KPI · S03 Split Statement · S04 Six Cells",
    "S05 Three Layers · S06 KPI Tower · S07 Horizontal Bar · S08 Duo Compare",
    "S09 Dot Matrix · S10 Split Closing · S11 Horizontal Timeline · S12 Manifesto+Banner",
    "S13 Three Forces · S14 Loop · S15 Matrix+Stat · S16 Multi-card Brief",
    "S17 System Diagram · S18 Why Now · S19 Four Cards · S20 Stacked KPI Ledger",
    "S21 Tech Spec Sheet · S22 Image Hero",
    "",
    "[Design Rules]",
    "- Layout diversity: use at least 5 different layouts across the deck. No same layout on 3 consecutive slides.",
    "- Chrome bar required on every slide: <div class=\"chrome-min\"><span class=\"t-cat\">SECTION LABEL</span><span class=\"r\">deck title or page</span></div>",
    "- Typography cue: place a short .t-cat kicker directly above every main heading (e.g. 'CORE VALUE', 'MARKET FIT', 'HOW IT WORKS'). Never use generic labels like COVER, SLIDE, BODY.",
    "- Emphasis-by-width: split layouts (S03, S08) must be 2fr:3fr — never 1fr:1fr.",
    "- No isolated SVG labels: all readable text must be HTML, not SVG <text> elements.",
    "- Spacing: .canvas-card padding is 5.6vh 5vw 5vw. Keep all content inside this safe area.",
    "- Dark slides (.dark): use --accent-bright (#5BA3FF) for .t-cat labels, not --accent.",
    "- S02 quote bar: wrap content in inner div with padding, add .s02-quote-bar as sibling. Never position: absolute.",
    "- S08 Duo Compare: protagonist/after panel must be wider (2fr:3fr). Include .vrule between columns.",
    "- S22 Image Hero: must include style=\"height:54vh\" on .frame-img to prevent overflow.",
    ...(s.additionalInstructions.trim() ? ["", "[Additional Instructions]", s.additionalInstructions.trim()] : []),
    ...(creditLines.length > 0 ? ["", "[Credit Information]", ...creditLines] : []),
    "",
    `[Slide Structure] (${count} slides)`,
    slideStructure,
    "",
    "[Final Instruction]",
    "Output complete, valid HTML for every slide section.",
    "Write real content based on the deck theme — no placeholder text, no lorem ipsum.",
    "Include all headings, body copy, data points, and structural elements.",
    "Verify each <section> has data-layout, correct theme class, chrome-min bar, and .t-cat kicker.",
  ];

  return parts.join("\n");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ label, labelEn, badge }: { label: string; labelEn?: string; badge?: "required" }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      {labelEn && <span className="text-xs text-gray-400">{labelEn}</span>}
      {badge === "required" && (
        <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">필수 REQUIRED</span>
      )}
    </div>
  );
}

function SectionHeader({ num, title, titleEn, badge }: { num: string; title: string; titleEn: string; badge?: "required" | "any" }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <span className="text-2xl font-bold text-[#152439]">{num}</span>
      <span className="text-xl font-bold text-[#152439]">{title}</span>
      <span className="text-sm text-gray-400">{titleEn}</span>
      {badge && (
        <span className={cn("ml-1 text-xs font-semibold uppercase tracking-wide", badge === "required" ? "text-red-500" : "text-gray-400")}>
          {badge === "required" ? "필수 REQUIRED" : badge}
        </span>
      )}
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm transition-all text-left",
        active ? "border-[#152439] bg-[#152439] text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      )}
    >
      {children}
    </button>
  );
}

// Layout picker per slide
function LayoutPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = LAYOUTS.find((l) => l.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-left text-sm transition-all flex items-center justify-between gap-2",
          value === "auto"
            ? "border-gray-200 bg-white text-gray-400"
            : "border-[#152439] bg-[#152439]/5 text-[#152439] font-medium"
        )}
      >
        <span>{value === "auto" ? "Auto (AI가 선택)" : `${value} · ${selected?.name ?? ""}`}</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            <button
              onClick={() => { onChange("auto"); setOpen(false); }}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3",
                value === "auto" && "bg-gray-50 font-medium text-[#152439]"
              )}
            >
              <span className="w-8 text-xs text-gray-400 font-mono shrink-0">AUTO</span>
              <span className="text-gray-600">AI가 내용에 맞게 선택</span>
            </button>
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => { onChange(l.id); setOpen(false); }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-start gap-3",
                  value === l.id && "bg-[#152439]/5 font-medium text-[#152439]"
                )}
              >
                <span className="w-8 text-xs font-mono font-bold shrink-0 pt-0.5 text-[#006ffd]">{l.id}</span>
                <div>
                  <div className="font-medium text-gray-800">{l.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{l.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HtmlSlidePrompter() {
  const [s, setS] = useState<State>({
    title: "",
    target: "",
    coreMessage: "",
    language: "한국어 중심",
    slideCount: 6,
    customSlideCount: "",
    defaultTheme: "dark",
    slides: buildDefaultSlides(6, "dark"),
    authorName: "",
    company: "",
    date: "",
    contact: "",
    cta: "",
    additionalInstructions: "",
  });
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof State>(key: K, val: State[K]) =>
    setS((prev) => ({ ...prev, [key]: val }));

  const effectiveCount = s.slideCount === "other" ? parseInt(s.customSlideCount) || 0 : s.slideCount;

  const livePrompt = useMemo(
    () => (effectiveCount > 0 ? buildHtmlPrompt(s) : ""),
    [s, effectiveCount]
  );

  const handleCopy = async () => {
    if (!livePrompt) return;
    await navigator.clipboard.writeText(livePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSlideCountChange = (count: number | "other") => {
    if (count === "other") { update("slideCount", "other"); return; }
    setS((prev) => ({
      ...prev,
      slideCount: count,
      slides:
        count > prev.slides.length
          ? [...prev.slides, ...buildDefaultSlides(count - prev.slides.length, prev.defaultTheme).map((sl, i) => ({
              ...sl,
              role: DEFAULT_ROLE_BY_INDEX[prev.slides.length + i] ?? "본론" as SlideRole,
              theme: DEFAULT_THEME_BY_INDEX[prev.slides.length + i] ?? prev.defaultTheme,
            }))]
          : prev.slides.slice(0, count),
    }));
  };

  const updateSlide = (idx: number, patch: Partial<SlideContent>) =>
    setS((prev) => {
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], ...patch };
      return { ...prev, slides };
    });

  const handleReset = () =>
    setS({
      title: "", target: "", coreMessage: "", language: "한국어 중심",
      slideCount: 6, customSlideCount: "", defaultTheme: "dark",
      slides: buildDefaultSlides(6, "dark"),
      authorName: "", company: "", date: "", contact: "", cta: "", additionalInstructions: "",
    });

  const THEME_OPTIONS: { val: SlideTheme; label: string; desc: string; color: string }[] = [
    { val: "dark", label: "Dark", desc: "#0A192F 배경 · 흰 텍스트", color: "bg-[#0a192f]" },
    { val: "light", label: "Light", desc: "#F7F9FB 배경 · 네이비 텍스트", color: "bg-[#f7f9fb] border border-gray-200" },
    { val: "accent", label: "Accent", desc: "#006FFD 배경 · 흰 텍스트", color: "bg-[#006ffd]" },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* ── 좌측 설정 패널 ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* ── 01 덱 정보 ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader num="01" title="덱 정보" titleEn="deck info" />
          <div className="space-y-5">
            <div>
              <FieldLabel label="슬라이드 제목" labelEn="title" />
              <input
                type="text"
                value={s.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="예시: Blux CRM 온보딩 전략 / 이커머스 재구매율을 높이는 자동화 마케팅"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
              />
            </div>
            <div>
              <FieldLabel label="대상" labelEn="target" />
              <input
                type="text"
                value={s.target}
                onChange={(e) => update("target", e.target.value)}
                placeholder="예시: 이커머스 CRM 담당자 / 마케팅팀장 / 블럭스 도입 검토 중인 의사결정자"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
              />
            </div>
            <div>
              <FieldLabel label="핵심 메시지" labelEn="core message" />
              <textarea
                value={s.coreMessage}
                onChange={(e) => update("coreMessage", e.target.value)}
                placeholder="예시: 블럭스 하나로 푸시·인앱·카카오를 연결하면, 고객 생애 가치가 눈에 띄게 달라집니다."
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
              />
            </div>
            <div>
              <FieldLabel label="언어" labelEn="language" />
              <div className="flex flex-wrap gap-2">
                {(["한국어 중심", "English main", "입력 언어 맞춤"] as Language[]).map((l) => (
                  <ToggleButton key={l} active={s.language === l} onClick={() => update("language", l)}>{l}</ToggleButton>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 02 슬라이드 구성 ────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader num="02" title="슬라이드 구성" titleEn="structure" badge="required" />
          <div className="space-y-5">
            {/* 슬라이드 수 */}
            <div>
              <FieldLabel label="슬라이드 수" badge="required" />
              <div className="flex flex-wrap gap-2">
                {SLIDE_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSlideCountChange(n)}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-medium transition-all",
                      s.slideCount === n ? "border-[#152439] bg-[#152439] text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >{n}</button>
                ))}
                <button
                  onClick={() => handleSlideCountChange("other")}
                  className={cn("h-9 rounded-lg border px-3 text-sm font-medium transition-all", s.slideCount === "other" ? "border-[#152439] bg-[#152439] text-white" : "border-gray-200 bg-white text-gray-700")}
                >other</button>
                {s.slideCount === "other" && (
                  <input
                    type="number" min={1} max={30}
                    value={s.customSlideCount}
                    onChange={(e) => update("customSlideCount", e.target.value)}
                    placeholder="장 수"
                    className="h-9 w-20 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#006ffd]"
                  />
                )}
              </div>
            </div>

            {/* 기본 테마 */}
            <div>
              <FieldLabel label="기본 슬라이드 테마" labelEn="default theme" />
              <p className="mb-2 text-xs text-gray-400">각 슬라이드에서 개별 변경 가능합니다.</p>
              <div className="flex gap-2">
                {THEME_OPTIONS.map(({ val, label, desc, color }) => (
                  <button
                    key={val}
                    onClick={() => update("defaultTheme", val)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm transition-all text-left",
                      s.defaultTheme === val ? "border-[#152439] bg-[#152439]/5" : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <span className={cn("w-4 h-4 rounded-sm shrink-0", color)} />
                    <div>
                      <div className="font-medium text-gray-800 text-xs">{label}</div>
                      <div className="text-[11px] text-gray-400">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 각 슬라이드 ──────────────────────────────────────── */}
        {effectiveCount > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <SectionHeader num="03" title="각 슬라이드" titleEn="per-slide settings" />
            <p className="mb-5 text-sm text-gray-400 leading-relaxed">
              역할, 레이아웃(S01–S22), 테마를 슬라이드별로 지정할 수 있습니다. 비워두면 AI가 자동 선택합니다.
            </p>
            <div className="space-y-5">
              {s.slides.slice(0, effectiveCount).map((sl, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-3 w-6 shrink-0 text-sm font-semibold text-gray-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 space-y-2">
                    {/* 역할 */}
                    <div className="flex flex-wrap gap-1.5">
                      {(["표지", "도입", "본론", "요약", "없음"] as SlideRole[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => updateSlide(i, { role })}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                            sl.role === role ? "border-[#152439] bg-[#152439] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          )}
                        >{SLIDE_ROLE_LABELS[role]}</button>
                      ))}
                      {/* 테마 */}
                      <div className="ml-auto flex gap-1">
                        {THEME_OPTIONS.map(({ val, label, color }) => (
                          <button
                            key={val}
                            onClick={() => updateSlide(i, { theme: val })}
                            title={label}
                            className={cn(
                              "h-6 w-6 rounded border-2 transition-all",
                              color,
                              sl.theme === val ? "border-[#152439] scale-110" : "border-transparent opacity-60 hover:opacity-100"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    {/* 레이아웃 */}
                    <LayoutPicker value={sl.layout} onChange={(v) => updateSlide(i, { layout: v })} />
                    {/* 내용 */}
                    <textarea
                      value={sl.content}
                      onChange={(e) => updateSlide(i, { content: e.target.value })}
                      placeholder="비워두면 GPT가 덱 주제에 맞게 자동 구성합니다. 예: 블럭스 주요 채널 — 푸시 / 인앱 / 카카오"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10 placeholder-gray-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 04 크레딧 & 기타 ────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader num="04" title="크레딧 & 기타" titleEn="credits & extras" badge="any" />
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "authorName" as const, label: "작성자", placeholder: "예시: Blux Growth Team" },
                { key: "company" as const, label: "소속", placeholder: "예시: Blux" },
                { key: "date" as const, label: "날짜", placeholder: "예시: June 2026" },
                { key: "contact" as const, label: "연락처 (마지막 슬라이드)", placeholder: "예시: blux.ai / hello@blux.ai" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block mb-1.5 text-xs font-medium text-gray-500">{label}</label>
                  <input
                    type="text" value={s[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white"
                  />
                </div>
              ))}
            </div>
            <div>
              <FieldLabel label="CTA (마지막 슬라이드)" />
              <input
                type="text" value={s.cta}
                onChange={(e) => update("cta", e.target.value)}
                placeholder="예시: 지금 바로 무료 체험 → blux.ai / 데모 신청하기 → 링크 삽입"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white"
              />
            </div>
            <div>
              <FieldLabel label="추가 지시사항" labelEn="additional instructions" />
              <textarea
                value={s.additionalInstructions}
                onChange={(e) => update("additionalInstructions", e.target.value)}
                placeholder="예시: S08 레이아웃은 블럭스 전후 비교로 사용 / 데이터는 실제 수치 대신 예시값 사용"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!livePrompt}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              !livePrompt
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-[#006ffd] text-white shadow-sm hover:bg-[#0058cc] active:scale-[0.99]"
            )}
          >
            {copied ? <><Check className="h-4 w-4" />복사됨</> : <><Copy className="h-4 w-4" />HTML 프롬프트 복사</>}
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />초기화
          </button>
        </div>
      </div>{/* end 좌측 */}

      {/* ── 우측 프롬프트 패널 ──────────────────────────────────── */}
      <div className="w-[400px] shrink-0 sticky top-[105px] self-start">
        {livePrompt ? (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <span className="text-sm font-semibold text-gray-800">생성된 프롬프트</span>
                <p className="text-xs text-gray-400 mt-0.5">Claude 또는 ChatGPT에 붙여넣기 하세요.</p>
              </div>
              <button
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  copied ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {copied ? <><Check className="h-3.5 w-3.5" />복사됨</> : <><Copy className="h-3.5 w-3.5" />복사</>}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words px-5 py-5 text-sm leading-relaxed text-gray-700 font-sans max-h-[calc(100vh-160px)] overflow-y-auto">
              {livePrompt}
            </pre>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-16 text-center">
            <div className="w-8 h-8 rounded bg-[#0a192f] mx-auto mb-3 flex items-center justify-center">
              <div className="w-3 h-3 bg-[#006ffd]" />
            </div>
            <p className="text-sm text-gray-400">슬라이드 수를 선택하면<br />자동으로 나타나요.</p>
            <p className="text-xs text-gray-300 mt-2">blux-slide-design HTML 출력용</p>
          </div>
        )}
      </div>
    </div>
  );
}
