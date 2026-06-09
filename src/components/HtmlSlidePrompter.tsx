import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Copy, RotateCcw, Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = "한국어 중심" | "English main";
type DeckTheme = "dark" | "light";

type SlideType =
  | "title"
  | "agenda"
  | "section-divider"
  | "content-standard"
  | "two-column"
  | "three-up-card"
  | "pain-grid"
  | "comparison-table"
  | "before-after"
  | "conversation"
  | "end";

interface Slide {
  type: SlideType;
  sectionHeader: string; // chrome 좌상단 섹션명
  content: string;
}

interface State {
  title: string;
  subtitle: string;
  target: string;
  coreMessage: string;
  language: Language;
  theme: DeckTheme;
  slideCount: number | "other";
  customSlideCount: string;
  slides: Slide[];
  authorName: string;
  company: string;
  date: string;
  contact: string;
  cta: string;
  additionalInstructions: string;
}

// ─── Slide type definitions ───────────────────────────────────────────────────

const SLIDE_TYPES: {
  id: SlideType;
  label: string;
  labelEn: string;
  desc: string;
  hasChrome: boolean;
}[] = [
  { id: "title", label: "타이틀", labelEn: "Title", desc: "덱 표지. 크롬 없음.", hasChrome: false },
  { id: "agenda", label: "아젠다", labelEn: "Agenda", desc: "목차 / 섹션 로드맵.", hasChrome: true },
  { id: "section-divider", label: "섹션 구분자", labelEn: "Section Divider", desc: "챕터 전환 구분 슬라이드.", hasChrome: true },
  { id: "content-standard", label: "본론 — 스탠다드", labelEn: "Standard", desc: "H1 + 지원 본문/비주얼. 가장 범용적.", hasChrome: true },
  { id: "two-column", label: "본론 — 2컬럼", labelEn: "Two Column", desc: "텍스트 + 스크린샷/비주얼 나란히.", hasChrome: true },
  { id: "three-up-card", label: "본론 — 3업 카드", labelEn: "Three-up Card", desc: "동급 3개 아이디어 카드.", hasChrome: true },
  { id: "pain-grid", label: "본론 — 페인 그리드", labelEn: "Pain Grid", desc: "문제점 나열. 빨간 강조.", hasChrome: true },
  { id: "comparison-table", label: "본론 — 비교 테이블", labelEn: "Comparison Table", desc: "매트릭스 형태 비교.", hasChrome: true },
  { id: "before-after", label: "본론 — 전후 비교", labelEn: "Before / After", desc: "기존(빨강) vs. 블럭스(파랑).", hasChrome: true },
  { id: "conversation", label: "본론 — 대화 데모", labelEn: "Conversation", desc: "User → Agent 대화 카드. 최대 4개.", hasChrome: true },
  { id: "end", label: "마무리", labelEn: "End", desc: "CTA / 감사 / 다음 스텝. 크롬 없음.", hasChrome: false },
];

const SLIDE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

const DEFAULT_TYPES: SlideType[] = ["title", "agenda", "content-standard", "content-standard", "content-standard", "end"];

function buildDefaultSlides(count: number): Slide[] {
  return Array.from({ length: count }, (_, i) => ({
    type: DEFAULT_TYPES[i] ?? "content-standard",
    sectionHeader: "",
    content: "",
  }));
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildBrief(s: State): string {
  const count = s.slideCount === "other" ? parseInt(s.customSlideCount) || 6 : s.slideCount;

  const slideLines = s.slides.slice(0, count).map((sl, i) => {
    const typeInfo = SLIDE_TYPES.find((t) => t.id === sl.type);
    const chromeLine = sl.sectionHeader.trim() && typeInfo?.hasChrome
      ? ` [섹션: ${sl.sectionHeader.trim()}]`
      : "";
    const contentLine = sl.content.trim() || "(덱 주제에 맞게 자동 구성)";
    return `${i + 1}. [${typeInfo?.labelEn ?? sl.type}]${chromeLine}\n   ${contentLine}`;
  }).join("\n");

  const creditParts: string[] = [];
  if (s.authorName.trim()) creditParts.push(`발표자: ${s.authorName.trim()}`);
  if (s.company.trim()) creditParts.push(`소속: ${s.company.trim()}`);
  if (s.date.trim()) creditParts.push(`날짜: ${s.date.trim()}`);

  const parts: string[] = [
    "아래 덱 브리프를 바탕으로 Blux 슬라이드를 제작해줘.",
    "",
    "## 덱 정보",
    `- 제목: ${s.title.trim() || "(제목 미입력)"}`,
    ...(s.subtitle.trim() ? [`- 부제목: ${s.subtitle.trim()}`] : []),
    ...(s.target.trim() ? [`- 대상: ${s.target.trim()}`] : []),
    ...(s.coreMessage.trim() ? [`- 핵심 메시지: ${s.coreMessage.trim()}`] : []),
    `- 테마: ${s.theme === "dark" ? "Dark (기본 — 네이비 배경)" : "Light (분석/보고서용 — 밝은 배경)"}`,
    `- 언어: ${s.language === "한국어 중심" ? "한국어 본문 + 영어 레이블/키워드" : "영어 본문 + 한국어 보조"}`,
    "",
    `## 슬라이드 구성 (${count}장)`,
    slideLines,
    ...(creditParts.length > 0 ? ["", "## 크레딧 (타이틀 슬라이드 하단)"] : []),
    ...(creditParts.length > 0 ? [creditParts.join(" · ")] : []),
    ...(s.contact.trim() ? ["", `## 연락처 (마지막 슬라이드)\n${s.contact.trim()}`] : []),
    ...(s.cta.trim() ? ["", `## CTA (마지막 슬라이드)\n${s.cta.trim()}`] : []),
    ...(s.additionalInstructions.trim() ? ["", `## 추가 지시사항\n${s.additionalInstructions.trim()}`] : []),
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

// Slide type picker (compact inline button group)
function SlideTypePicker({ value, onChange }: { value: SlideType; onChange: (v: SlideType) => void }) {
  const [open, setOpen] = useState(false);
  const selected = SLIDE_TYPES.find((t) => t.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-[#152439] bg-[#152439]/5 text-[#152439] px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all hover:bg-[#152439]/10"
      >
        {selected?.label ?? value}
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {SLIDE_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 flex flex-col gap-0.5",
                  value === t.id && "bg-[#152439]/5"
                )}
              >
                <div className="font-semibold text-gray-800">{t.label} <span className="font-normal text-gray-400">{t.labelEn}</span></div>
                <div className="text-gray-400">{t.desc}</div>
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
    subtitle: "",
    target: "",
    coreMessage: "",
    language: "한국어 중심",
    theme: "dark",
    slideCount: 6,
    customSlideCount: "",
    slides: buildDefaultSlides(6),
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
    () => (effectiveCount > 0 ? buildBrief(s) : ""),
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
      slides: count > prev.slides.length
        ? [...prev.slides, ...buildDefaultSlides(count - prev.slides.length).map((sl, i) => ({
            ...sl,
            type: DEFAULT_TYPES[prev.slides.length + i] ?? ("content-standard" as SlideType),
          }))]
        : prev.slides.slice(0, count),
    }));
  };

  const updateSlide = (idx: number, patch: Partial<Slide>) =>
    setS((prev) => {
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], ...patch };
      return { ...prev, slides };
    });

  const handleReset = () =>
    setS({
      title: "", subtitle: "", target: "", coreMessage: "",
      language: "한국어 중심", theme: "dark",
      slideCount: 6, customSlideCount: "",
      slides: buildDefaultSlides(6),
      authorName: "", company: "", date: "", contact: "", cta: "", additionalInstructions: "",
    });

  return (
    <div className="flex gap-6 items-start">
      {/* ── 좌측 설정 패널 ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* 안내 배너 */}
        <div className="rounded-xl bg-[#0a192f] px-5 py-4 flex items-start gap-3">
          <div className="w-2 h-2 rounded-sm bg-[#006ffd] mt-1.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">사용 방법</p>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              아래 폼을 채우고 브리프를 복사한 뒤, Claude에서{" "}
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-white/80">/blux-slide-design</code>을
              실행하고 브리프를 붙여넣으면 슬라이드가 생성됩니다.
            </p>
          </div>
        </div>

        {/* ── 01 덱 정보 ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader num="01" title="덱 정보" titleEn="deck info" />
          <div className="space-y-5">
            <div>
              <FieldLabel label="제목" labelEn="title" badge="required" />
              <input type="text" value={s.title} onChange={(e) => update("title", e.target.value)}
                placeholder="예시: Blux CRM 온보딩 전략 / 이커머스 재구매율을 높이는 자동화 마케팅"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10" />
            </div>
            <div>
              <FieldLabel label="부제목" labelEn="subtitle" />
              <input type="text" value={s.subtitle} onChange={(e) => update("subtitle", e.target.value)}
                placeholder="예시: 2026년 상반기 CRM 전략 / Blux Growth Team"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10" />
            </div>
            <div>
              <FieldLabel label="대상" labelEn="target audience" />
              <input type="text" value={s.target} onChange={(e) => update("target", e.target.value)}
                placeholder="예시: 이커머스 CRM 담당자 / 마케팅팀장 / 블럭스 도입 검토 중인 의사결정자"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10" />
            </div>
            <div>
              <FieldLabel label="핵심 메시지" labelEn="core message" />
              <textarea value={s.coreMessage} onChange={(e) => update("coreMessage", e.target.value)}
                placeholder="예시: 블럭스 하나로 푸시·인앱·카카오를 연결하면, 고객 생애 가치가 눈에 띄게 달라집니다."
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 테마 */}
              <div>
                <FieldLabel label="테마" labelEn="theme" />
                <div className="flex flex-col gap-2">
                  {([
                    { val: "dark" as DeckTheme, label: "Dark", desc: "기본 — 네이비 배경", color: "bg-[#0a192f]" },
                    { val: "light" as DeckTheme, label: "Light", desc: "분석/보고서용", color: "bg-[#f7f9fb] border border-gray-200" },
                  ]).map(({ val, label, desc, color }) => (
                    <button key={val} onClick={() => update("theme", val)}
                      className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                        s.theme === val ? "border-[#152439] bg-[#152439]/5" : "border-gray-200 bg-white hover:border-gray-300"
                      )}>
                      <span className={cn("w-5 h-5 rounded shrink-0", color)} />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* 언어 */}
              <div>
                <FieldLabel label="언어" labelEn="language" />
                <div className="flex flex-col gap-2">
                  {([
                    { val: "한국어 중심" as Language, label: "한국어 중심", desc: "본문 한국어 + 영어 키워드" },
                    { val: "English main" as Language, label: "English main", desc: "본문 영어 + 한국어 보조" },
                  ]).map(({ val, label, desc }) => (
                    <button key={val} onClick={() => update("language", val)}
                      className={cn("flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all",
                        s.language === val ? "border-[#152439] bg-[#152439]/5" : "border-gray-200 bg-white hover:border-gray-300"
                      )}>
                      <div className="text-sm font-medium text-gray-800">{label}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 02 슬라이드 구성 ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader num="02" title="슬라이드 구성" titleEn="structure" badge="required" />
          <div>
            <FieldLabel label="슬라이드 수" badge="required" />
            <div className="flex flex-wrap gap-2">
              {SLIDE_COUNTS.map((n) => (
                <button key={n} onClick={() => handleSlideCountChange(n)}
                  className={cn("h-9 w-9 rounded-lg border text-sm font-medium transition-all",
                    s.slideCount === n ? "border-[#152439] bg-[#152439] text-white" : "border-gray-200 bg-white hover:border-gray-300"
                  )}>{n}</button>
              ))}
              <button onClick={() => handleSlideCountChange("other")}
                className={cn("h-9 rounded-lg border px-3 text-sm font-medium transition-all",
                  s.slideCount === "other" ? "border-[#152439] bg-[#152439] text-white" : "border-gray-200 bg-white"
                )}>other</button>
              {s.slideCount === "other" && (
                <input type="number" min={1} max={30} value={s.customSlideCount}
                  onChange={(e) => update("customSlideCount", e.target.value)}
                  placeholder="장 수"
                  className="h-9 w-20 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#006ffd]" />
              )}
            </div>
          </div>
        </section>

        {/* ── 03 각 슬라이드 ──────────────────────────────────────── */}
        {effectiveCount > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <SectionHeader num="03" title="각 슬라이드" titleEn="per-slide content" />
            <p className="mb-5 text-sm text-gray-400 leading-relaxed">
              슬라이드 타입을 선택하고 내용을 입력하세요. 비워두면 AI가 덱 주제에 맞게 자동 구성합니다.
              크롬 있는 슬라이드는 섹션명(좌상단)을 지정할 수 있어요.
            </p>
            <div className="space-y-4">
              {s.slides.slice(0, effectiveCount).map((sl, i) => {
                const typeInfo = SLIDE_TYPES.find((t) => t.id === sl.type);
                return (
                  <div key={i} className="flex gap-3">
                    <span className="mt-2.5 w-6 shrink-0 text-sm font-semibold text-gray-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SlideTypePicker value={sl.type} onChange={(v) => updateSlide(i, { type: v })} />
                        {typeInfo?.hasChrome && (
                          <input
                            type="text"
                            value={sl.sectionHeader}
                            onChange={(e) => updateSlide(i, { sectionHeader: e.target.value })}
                            placeholder="섹션명 (크롬 좌상단)"
                            className="h-8 flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none transition focus:border-[#006ffd] focus:bg-white placeholder-gray-300"
                          />
                        )}
                      </div>
                      <textarea
                        value={sl.content}
                        onChange={(e) => updateSlide(i, { content: e.target.value })}
                        placeholder="비워두면 GPT가 자동 구성. 예: 블럭스 3가지 채널 — 푸시 / 인앱 / 카카오"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10 placeholder-gray-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 04 크레딧 & CTA ────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader num="04" title="크레딧 & CTA" titleEn="credits & cta" badge="any" />
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "authorName" as const, label: "발표자", placeholder: "Blux Growth Team" },
                { key: "company" as const, label: "소속", placeholder: "Blux" },
                { key: "date" as const, label: "날짜", placeholder: "June 2026" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block mb-1.5 text-xs font-medium text-gray-500">{label}</label>
                  <input type="text" value={s[key]} onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white" />
                </div>
              ))}
            </div>
            <div>
              <FieldLabel label="연락처" labelEn="마지막 슬라이드" />
              <input type="text" value={s.contact} onChange={(e) => update("contact", e.target.value)}
                placeholder="예시: blux.ai / hello@blux.ai"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white" />
            </div>
            <div>
              <FieldLabel label="CTA" labelEn="마지막 슬라이드" />
              <input type="text" value={s.cta} onChange={(e) => update("cta", e.target.value)}
                placeholder="예시: 지금 바로 무료 체험 → blux.ai / 데모 신청하기"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white" />
            </div>
            <div>
              <FieldLabel label="추가 지시사항" />
              <textarea value={s.additionalInstructions} onChange={(e) => update("additionalInstructions", e.target.value)}
                placeholder="예시: 슬라이드 3에 before-after 비교 강조 / 대화 데모는 실제 블럭스 시나리오로"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white" />
            </div>
          </div>
        </section>

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex gap-2">
          <button onClick={handleCopy} disabled={!livePrompt}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              !livePrompt ? "cursor-not-allowed bg-gray-100 text-gray-400" : "bg-[#0a192f] text-white shadow-sm hover:bg-[#152439] active:scale-[0.99]"
            )}>
            {copied ? <><Check className="h-4 w-4" />복사됨</> : <><Copy className="h-4 w-4" />브리프 복사</>}
          </button>
          <button onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
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
                <span className="text-sm font-semibold text-gray-800">덱 브리프</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  복사 → Claude에서{" "}
                  <code className="bg-gray-100 px-1 rounded">/blux-slide-design</code> 실행 후 붙여넣기
                </p>
              </div>
              <button onClick={handleCopy}
                className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  copied ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>
                {copied ? <><Check className="h-3.5 w-3.5" />복사됨</> : <><Copy className="h-3.5 w-3.5" />복사</>}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words px-5 py-5 text-sm leading-relaxed text-gray-700 font-sans max-h-[calc(100vh-160px)] overflow-y-auto">
              {livePrompt}
            </pre>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-16 text-center">
            <div className="w-10 h-7 rounded bg-[#0a192f] mx-auto mb-3 flex items-center justify-center">
              <div className="text-[10px] font-bold text-[#006ffd] tracking-wide">blux</div>
            </div>
            <p className="text-sm text-gray-400">슬라이드 수를 선택하면<br />브리프가 나타납니다.</p>
            <p className="text-xs text-gray-300 mt-2">/blux-slide-design 스킬용</p>
          </div>
        )}
      </div>
    </div>
  );
}
