import { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, RotateCcw, Sparkles, Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = "한국어 중심" | "English main" | "입력 언어 맞춤";
type ProceedMode = "바로 생성" | "구성안 확인";
type SlideType = "단일 모드" | "첫 챕터" | "중간 챕터" | "마지막 챕터";
type VisualStyle = "navy-dark" | "paper-light" | "accent-blue" | "ink-minimal";
type Typeface = "No specification" | "Gothic (SUIT)" | "Gothic (Pretendard)" | "Handwritten style";
type Legibility = "높은 가독성" | "표준 가독성" | "에디토리얼 작은 글자";
type SlideRole = "표지" | "도입" | "본론" | "요약" | "없음";

interface SlideContent {
  role: SlideRole;
  content: string;
}

interface State {
  title: string;
  target: string;
  coreMessage: string;
  impression: string;
  language: Language;
  proceedMode: ProceedMode;
  slideCount: number | "other";
  customSlideCount: string;
  slideType: SlideType;
  visualStyle: VisualStyle;
  typeface: Typeface;
  legibility: Legibility;
  slides: SlideContent[];
  brandColor: string;
  showPageNumber: boolean;
  showFooterTitle: boolean;
  coverPosition: "왼쪽" | "오른쪽";
  summaryLayout: "좌우 분할" | "상하 2단";
  authorName: string;
  company: string;
  date: string;
  contact: string;
  cta: string;
  additionalInstructions: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLIDE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8];

const VISUAL_STYLES: {
  id: VisualStyle;
  name: string;
  nameEn: string;
  desc: string;
  tags: string[];
  promptDesc: string;
}[] = [
  {
    id: "navy-dark",
    name: "네이비 다크",
    nameEn: "Navy Dark",
    desc: "블럭스 메인 테마. 딥 네이비 배경에 블루 악센트로 신뢰·전문성을 전달합니다. 프로젝션 발표에 최적.",
    tags: ["dark", "navy", "presentation", "B2B"],
    promptDesc:
      "Dark navy background (#0a192f) with #006FFD blue accent and white typography. Blux brand's primary theme. High contrast, professional, projection-optimized. No gradients, no shadows, no rounded cards. Urbane display font for hero text, Pretendard for body.",
  },
  {
    id: "paper-light",
    name: "페이퍼 라이트",
    nameEn: "Paper Light",
    desc: "오프화이트 배경에 넓은 여백과 블루 악센트. 인쇄·PDF 공유에 최적인 B2B 보고서 스타일.",
    tags: ["light", "white", "report", "print"],
    promptDesc:
      "Off-white background (#f7f9fb) with dark navy ink (#0a192f) and #006FFD blue accent. Wide margins, generous whitespace. Optimized for printed reports and PDF sharing. No gradients, no shadows, flat layout.",
  },
  {
    id: "accent-blue",
    name: "악센트 블루",
    nameEn: "Accent Blue",
    desc: "블럭스 블루(#006FFD)를 배경 전면에 사용. 런칭·발표·키 슬라이드에 임팩트를 줍니다.",
    tags: ["blue", "bold", "launch", "impact"],
    promptDesc:
      "Full #006FFD blue background with white typography and #0a192f navy as secondary surface. High-impact cover and key slides. Accent color used as the dominant background — typography and geometric shapes carry the layout. No gradients, no shadows.",
  },
  {
    id: "ink-minimal",
    name: "잉크 미니멀",
    nameEn: "Ink Minimal",
    desc: "다크 배경에 타이포그래피만으로 레이아웃을 구성. 블루 악센트는 극소량. 에디토리얼·인사이트 느낌.",
    tags: ["minimal", "editorial", "type-driven", "dark"],
    promptDesc:
      "Deep navy (#0a192f) background with layout driven entirely by typography hierarchy. #006FFD accent used sparingly — one element per slide maximum. No illustrations, no icons, no decorative elements. Editorial and insight-report mood. Large Urbane display text as the primary visual element.",
  },
];

const SLIDE_ROLE_LABELS: Record<SlideRole, string> = {
  표지: "표지 cover",
  도입: "도입 Intro",
  본론: "본론 Body",
  요약: "요약 Closing",
  없음: "없음 none",
};

const DEFAULT_ROLE_BY_INDEX: SlideRole[] = [
  "표지",
  "도입",
  "본론",
  "본론",
  "본론",
  "요약",
];

// ─── Default slide structure builder ─────────────────────────────────────────

function buildDefaultSlides(count: number): SlideContent[] {
  return Array.from({ length: count }, (_, i) => ({
    role: DEFAULT_ROLE_BY_INDEX[i] ?? "본론",
    content: "",
  }));
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildSlidePrompt(s: State): string {
  const count =
    s.slideCount === "other"
      ? parseInt(s.customSlideCount) || 6
      : s.slideCount;

  const style = VISUAL_STYLES.find((v) => v.id === s.visualStyle);

  const languageRule =
    s.language === "한국어 중심"
      ? "Main body copy should be Korean. Use concise English for section labels, short catchphrases, metrics, product terms, and key business keywords. The result should feel naturally Korean-led with selective English emphasis."
      : s.language === "English main"
        ? "Main body copy should be English. Use Korean for supplementary descriptions and explanatory text where helpful."
        : "Match the primary language to the user-provided input. Mix English keywords naturally where they improve clarity.";

  const typographyRule =
    s.legibility === "높은 가독성"
      ? "Use large, high-visibility text that remains readable from projection distance."
      : s.legibility === "표준 가독성"
        ? "Use standard-sized body text with clear hierarchy."
        : "Use editorial small type for a magazine-like feel. Prioritize visual rhythm over legibility at distance.";

  const typefaceRule =
    s.typeface === "No specification"
      ? ""
      : `Preferred typeface: ${s.typeface}.`;

  const isChapterMode =
    s.slideType === "첫 챕터" ||
    s.slideType === "중간 챕터" ||
    s.slideType === "마지막 챕터";

  const chapterContext = isChapterMode
    ? `\nThis deck is the "${s.slideType}" of a multi-chapter presentation. Adjust tone and pacing accordingly.`
    : "";

  const slideStructure = s.slides
    .slice(0, count)
    .map((sl, i) => {
      const roleLabel =
        sl.role === "표지"
          ? "Cover"
          : sl.role === "도입"
            ? "Intro"
            : sl.role === "본론"
              ? "Body"
              : sl.role === "요약"
                ? "Summary / Next Action"
                : "(skip this slide)";
      const contentNote = sl.content.trim()
        ? `Content hint: ${sl.content.trim()}`
        : "Generate content automatically based on the deck theme.";
      return `${i + 1}. ${roleLabel}: ${contentNote}`;
    })
    .join("\n");

  const decorations: string[] = [];
  if (s.showPageNumber)
    decorations.push('Include page numbers in "current/total" format, placed unobtrusively.');
  if (s.showFooterTitle)
    decorations.push("Repeat the deck title in the footer for continuity.");

  const credits: string[] = [];
  if (s.authorName) credits.push(`Author: ${s.authorName}`);
  if (s.company) credits.push(`Company: ${s.company}`);
  if (s.date) credits.push(`Date: ${s.date}`);
  if (s.contact) credits.push(`Contact: ${s.contact}`);
  if (s.cta) credits.push(`CTA: ${s.cta}`);

  const brandColorLine = s.brandColor.trim()
    ? `\nBrand color: ${s.brandColor.trim()}`
    : "";

  const additionalLine = s.additionalInstructions.trim()
    ? `\n[Additional Instructions]\n${s.additionalInstructions.trim()}`
    : "";

  const coverLayoutLine =
    s.coverPosition === "오른쪽"
      ? "Cover layout: message on the right, visual on the left."
      : "Cover layout: message on the left, visual on the right.";

  const summaryLayoutLine =
    s.summaryLayout === "상하 2단"
      ? "Summary layout: top message / bottom next actions (stacked two-row)."
      : "Summary layout: left recap message / right next actions (side-by-side).";

  const conceptLine = [s.coreMessage.trim(), s.impression.trim()]
    .filter(Boolean)
    .join(" — ");

  const promptParts = [
    "You are a professional slide designer.",
    `Create a ${count}-slide presentation${s.target.trim() ? ` for ${s.target.trim()}` : " for seminars or internal meetings"} in one consistent visual world.`,
    "",
    "[Output Format]",
    "- Image ratio: 16:9 widescreen presentation",
    `- Number of slides: ${count}`,
    "- Image generation: use imagegen to generate the slide images sequentially",
    "",
    conceptLine
      ? `[Concept]${conceptLine}`
      : "[Concept]Large headings readable during projection, generous spacing, and one clear theme per slide",
    "",
    `[Language Rule]\n${languageRule}`,
    "",
    `[Visual Style]${style?.promptDesc ?? ""}`,
    "",
    `[Typography]${typographyRule}${typefaceRule ? " " + typefaceRule : ""}`,
    "",
    "[Common Rules]",
    ...(brandColorLine ? [brandColorLine] : []),
    ...(decorations.length > 0 ? decorations.map((d) => `- ${d}`) : []),
    "",
    "[Design Rules]",
    "- Visual consistency: All slides must look as if the same designer created them in sequence. Match not only colors and typography, but also the level of decoration, illustration density, diagram detail, and dimensionality.",
    "- Composition variety: Do not repeat the same composition across the deck. Change the lead element according to the content.",
    "- Information density: Limit each slide to one message. Bullet lists should have at most three items.",
    "- Spacing: Keep a safe margin on all four edges equal to about 7-8% of the short side. Keep at least 30% of the canvas as empty space.",
    "- Communication: Minimize text and communicate through diagrams, icons, and generous empty space.",
    '- Typography cue: Place a subtle 1-2 word English catchphrase directly above the main heading (e.g. STEP 01 / INSPECT). Do not use generic labels like COVER or OUTRO.',
    "- Layout freedom: Leave the upper-right area intentionally quiet.",
    `- ${coverLayoutLine}`,
    `- ${summaryLayoutLine}`,
    ...(isChapterMode ? [chapterContext] : []),
    "",
    "[Prohibited Patterns]",
    "- Card-row template ban: Do not use three or four white rounded cards in a row.",
    "- Step-flow template ban: Avoid numbered badge step diagrams.",
    "",
    "[Slide-Type Layout Rules]",
    "### Cover",
    "Layout: Side-by-side. Left: typography (title, subtitle, credits). Right: symbolic visual scene.",
    "Prohibited: icon-organizing layout; top-and-bottom two-tier composition.",
    "",
    "### Intro",
    "Layout: Top heading + subcopy. Bottom: table-of-contents or roadmap with 3-5 icons and labels.",
    "Prohibited: left-right split; pictorial 3D diagram in the lower area.",
    "",
    "### Body",
    "Layout: Top heading + subcopy. Bottom: full-width pictorial expression (3D diagram, chart, photo, editorial diagram).",
    "Prohibited: left-right text/diagram split; intro-style icon roadmap.",
    "",
    "### Summary / Next Action",
    "Layout: Side-by-side. Left: recap message. Right: 3-4 next actions with icons and one-line descriptions.",
    "Prohibited: visual-scene-centered right side; top-and-bottom two-tier.",
    "",
    `[Slide Structure] (${count} slides)`,
    slideStructure,
    "",
    ...(credits.length > 0
      ? [`[Credit Information]\n${credits.join("\n")}`]
      : []),
    additionalLine,
    "",
    "[Final Instruction]",
    "Use imagegen without fail, and generate the slide images one by one in the order above.",
    "Do not stop at the outline. Create all completed slide images.",
  ];

  return promptParts.filter((p) => p !== null).join("\n");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  num,
  title,
  titleEn,
  badge,
}: {
  num: string;
  title: string;
  titleEn: string;
  badge?: "required" | "optional" | "any";
}) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <span className="text-2xl font-bold text-[#152439]">{num}</span>
      <span className="text-xl font-bold text-[#152439]">{title}</span>
      <span className="text-sm text-gray-400 font-normal">{titleEn}</span>
      {badge && (
        <span
          className={cn(
            "ml-1 text-xs font-semibold uppercase tracking-wide",
            badge === "required" ? "text-red-500" : "text-gray-400"
          )}
        >
          {badge === "required" ? "필수 REQUIRED" : badge}
        </span>
      )}
    </div>
  );
}

function FieldLabel({
  label,
  labelEn,
  badge,
}: {
  label: string;
  labelEn?: string;
  badge?: "required" | "optional";
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      {labelEn && <span className="text-xs text-gray-400">{labelEn}</span>}
      {badge === "required" && (
        <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">
          필수 REQUIRED
        </span>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-2 text-sm transition-all text-left",
        active
          ? "border-[#152439] bg-[#152439] text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SlidePrompter() {
  const [s, setS] = useState<State>({
    title: "",
    target: "",
    coreMessage: "",
    impression: "",
    language: "한국어 중심",
    proceedMode: "바로 생성",
    slideCount: 6,
    customSlideCount: "",
    slideType: "단일 모드",
    visualStyle: "navy-dark",
    typeface: "No specification",
    legibility: "높은 가독성",
    slides: buildDefaultSlides(6),
    brandColor: "",
    showPageNumber: false,
    showFooterTitle: false,
    coverPosition: "왼쪽",
    summaryLayout: "좌우 분할",
    authorName: "",
    company: "",
    date: "",
    contact: "",
    cta: "",
    additionalInstructions: "",
  });

  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof State>(key: K, val: State[K]) =>
    setS((prev) => ({ ...prev, [key]: val }));

  const handleSlideCountChange = (count: number | "other") => {
    if (count === "other") {
      update("slideCount", "other");
      return;
    }
    update("slideCount", count);
    setS((prev) => ({
      ...prev,
      slideCount: count,
      slides:
        prev.slides.length === count
          ? prev.slides
          : count > prev.slides.length
            ? [
                ...prev.slides,
                ...buildDefaultSlides(count - prev.slides.length).map(
                  (sl, i) => ({
                    ...sl,
                    role:
                      DEFAULT_ROLE_BY_INDEX[prev.slides.length + i] ?? "본론",
                  })
                ),
              ]
            : prev.slides.slice(0, count),
    }));
  };

  const handleSlideRoleChange = (idx: number, role: SlideRole) => {
    setS((prev) => {
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], role };
      return { ...prev, slides };
    });
  };

  const handleSlideContentChange = (idx: number, content: string) => {
    setS((prev) => {
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], content };
      return { ...prev, slides };
    });
  };

  const effectiveCount =
    s.slideCount === "other"
      ? parseInt(s.customSlideCount) || 0
      : s.slideCount;

  const canGenerate = effectiveCount > 0 && s.visualStyle;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setPrompt(buildSlidePrompt(s));
    setTimeout(() => {
      document
        .getElementById("slide-output")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setS({
      title: "",
      target: "",
      coreMessage: "",
      impression: "",
      language: "한국어 중심",
      proceedMode: "바로 생성",
      slideCount: 6,
      customSlideCount: "",
      slideType: "단일 모드",
      visualStyle: "navy-dark",
      typeface: "No specification",
      legibility: "높은 가독성",
      slides: buildDefaultSlides(6),
      brandColor: "",
      showPageNumber: false,
      showFooterTitle: false,
      coverPosition: "왼쪽",
      summaryLayout: "좌우 분할",
      authorName: "",
      company: "",
      date: "",
      contact: "",
      cta: "",
      additionalInstructions: "",
    });
    setPrompt("");
  };

  return (
    <div className="flex gap-6 items-start">
      {/* ── 좌측 설정 패널 ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">
      {/* ── 01 메시지 ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <SectionHeader
          num="01"
          title="전하고 싶은 메시지"
          titleEn="any"
        />

        <div className="space-y-5">
          <div>
            <FieldLabel label="슬라이드 제목" labelEn="slide title" />
            <input
              type="text"
              value={s.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="예시: Blux CRM 온보딩 전략 / 이커머스 재구매율을 높이는 자동화 마케팅"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              슬라이드 전체 주제를 한 문장으로 적습니다. 첫 페이지 커버에도
              반영됩니다.
            </p>
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
            <p className="mt-1.5 text-xs text-gray-400">
              누구를 위한 발표인지 한 줄로 적습니다.
            </p>
          </div>

          <div>
            <FieldLabel label="핵심 메시지" labelEn="my point" />
            <textarea
              value={s.coreMessage}
              onChange={(e) => update("coreMessage", e.target.value)}
              placeholder="예시: 블럭스 하나로 푸시·인앱·카카오를 연결하면, 고객 생애 가치가 눈에 띄게 달라집니다."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              이 덱으로 전달하고 싶은 결론이나 주요 포인트를 짧게 적습니다.
            </p>
          </div>

          <div>
            <FieldLabel label="남기고 싶은 인상" labelEn="impression" />
            <input
              type="text"
              value={s.impression}
              onChange={(e) => update("impression", e.target.value)}
              placeholder="예시: 바로 쓸 수 있는 느낌 / 복잡하지 않고 실용적 / 데이터 기반의 신뢰감"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              프리셋만으로 담기 어려운 분위기와 감정을 보완합니다.
            </p>
          </div>

          <div>
            <FieldLabel label="메인 언어" labelEn="Main language" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    val: "한국어 중심" as Language,
                    title: "한국어 중심 + English keywords",
                    desc: "본문은 한국어, 라벨/키워드는 영어를 섞습니다.",
                  },
                  {
                    val: "English main" as Language,
                    title: "English main + 한국어 보조",
                    desc: "본문은 영어, 보조 문구는 한국어를 허용합니다.",
                  },
                  {
                    val: "입력 언어 맞춤" as Language,
                    title: "입력 언어 맞춤",
                    desc: "사용자가 입력한 언어를 우선하고 필요한 키워드만 섞습니다.",
                  },
                ] as const
              ).map(({ val, title, desc }) => (
                <button
                  key={val}
                  onClick={() => update("language", val)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    s.language === val
                      ? "border-[#152439] bg-[#152439] text-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <p className="text-sm font-medium">{title}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      s.language === val ? "text-white/70" : "text-gray-400"
                    )}
                  >
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="진행 방식" labelEn="How to proceed" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  {
                    val: "바로 생성" as ProceedMode,
                    title: "바로 슬라이드 생성",
                    desc: "붙여넣은 뒤 즉시 이미지를 생성합니다. Default",
                  },
                  {
                    val: "구성안 확인" as ProceedMode,
                    title: "먼저 구성안 확인",
                    desc: "ChatGPT가 제안 구조를 먼저 보여주고, 확인 후 이미지를 생성합니다.",
                  },
                ] as const
              ).map(({ val, title, desc }) => (
                <button
                  key={val}
                  onClick={() => update("proceedMode", val)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    s.proceedMode === val
                      ? "border-[#152439] bg-[#152439] text-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <p className="text-sm font-medium">{title}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      s.proceedMode === val ? "text-white/70" : "text-gray-400"
                    )}
                  >
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 02 디자인 ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <SectionHeader
          num="02"
          title="디자인"
          titleEn="design"
          badge="required"
        />

        <div className="space-y-6">
          {/* 슬라이드 수 */}
          <div>
            <FieldLabel
              label="슬라이드 수"
              labelEn="Number of slides"
              badge="required"
            />
            <div className="flex flex-wrap gap-2">
              {SLIDE_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => handleSlideCountChange(n)}
                  className={cn(
                    "h-9 w-9 rounded-lg border text-sm font-medium transition-all",
                    s.slideCount === n
                      ? "border-[#152439] bg-[#152439] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => handleSlideCountChange("other")}
                className={cn(
                  "h-9 rounded-lg border px-3 text-sm font-medium transition-all",
                  s.slideCount === "other"
                    ? "border-[#152439] bg-[#152439] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                )}
              >
                other
              </button>
              {s.slideCount === "other" && (
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={s.customSlideCount}
                  onChange={(e) => update("customSlideCount", e.target.value)}
                  placeholder="장 수 입력"
                  className="h-9 w-24 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#006ffd] focus:ring-2 focus:ring-[#006ffd]/10"
                />
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              9장 이상이 필요하면 챕터별로 나누어 여러 번 생성하세요.
            </p>
          </div>

          {/* 슬라이드 타입 */}
          <div>
            <FieldLabel
              label="슬라이드 타입"
              labelEn="Slide type"
            />
            <p className="mb-2 text-xs text-gray-400">
              9장 이상을 챕터로 나눌 때만 변경합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["단일 모드", "첫 챕터", "중간 챕터", "마지막 챕터"] as SlideType[]).map(
                (t) => (
                  <ToggleButton
                    key={t}
                    active={s.slideType === t}
                    onClick={() => update("slideType", t)}
                  >
                    {t}
                  </ToggleButton>
                )
              )}
            </div>
          </div>

          {/* 시각 스타일 */}
          <div>
            <FieldLabel
              label="시각 스타일"
              labelEn="Visual Style"
              badge="required"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VISUAL_STYLES.map((vs) => (
                <button
                  key={vs.id}
                  onClick={() => update("visualStyle", vs.id)}
                  className={cn(
                    "rounded-xl border-2 overflow-hidden text-left transition-all",
                    s.visualStyle === vs.id
                      ? "border-[#152439]"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {/* Preview tile */}
                  <div className="h-24 w-full flex items-center justify-center overflow-hidden">
                    <StylePreview id={vs.id} />
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-sm font-semibold text-gray-800">
                      {vs.name}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        {vs.nameEn}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      {vs.desc}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {vs.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 글꼴 */}
          <div>
            <FieldLabel label="글꼴" labelEn="Typeface" />
            <div className="flex flex-wrap gap-2">
              {(
                ["No specification", "Gothic (SUIT)", "Gothic (Pretendard)", "Handwritten style"] as Typeface[]
              ).map((t) => (
                <ToggleButton
                  key={t}
                  active={s.typeface === t}
                  onClick={() => update("typeface", t)}
                >
                  {t}
                </ToggleButton>
              ))}
            </div>
          </div>

          {/* 텍스트 가독성 */}
          <div>
            <FieldLabel label="텍스트 가독성" labelEn="Text legibility" />
            <div className="flex flex-wrap gap-2">
              {(["높은 가독성", "표준 가독성", "에디토리얼 작은 글자"] as Legibility[]).map(
                (l) => (
                  <ToggleButton
                    key={l}
                    active={s.legibility === l}
                    onClick={() => update("legibility", l)}
                  >
                    {l}
                  </ToggleButton>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 각 슬라이드 내용 ─────────────────────────────────── */}
      {effectiveCount > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <SectionHeader
            num="03"
            title="각 슬라이드 내용"
            titleEn="optional / any"
          />
          <p className="mb-5 text-sm text-gray-400 leading-relaxed">
            각 페이지의 역할을 버튼으로 설정하고, 내용은 줄 단위로 입력할 수
            있습니다. 내용을 비워두면 GPT가 내용을 자동으로 구성합니다.
          </p>
          <div className="space-y-4">
            {s.slides.slice(0, effectiveCount).map((sl, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-2.5 w-6 shrink-0 text-sm font-semibold text-gray-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      ["표지", "도입", "본론", "요약", "없음"] as SlideRole[]
                    ).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleSlideRoleChange(i, role)}
                        className={cn(
                          "rounded-md border px-3 py-1 text-xs font-medium transition-all",
                          sl.role === role
                            ? "border-[#152439] bg-[#152439] text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        )}
                      >
                        {SLIDE_ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={sl.content}
                    onChange={(e) => handleSlideContentChange(i, e.target.value)}
                    placeholder="비워두면 GPT가 덱 주제에 맞게 자동 구성합니다. 예: 블럭스 주요 기능 3가지 — 푸시 / 인앱 / 카카오"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10 placeholder-gray-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 04 고급 설정 ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <SectionHeader
          num="04"
          title="고급 설정"
          titleEn="Advanced settings"
          badge="any"
        />

        <div className="space-y-6">
          {/* 브랜드 컬러 */}
          <div>
            <FieldLabel label="브랜드 컬러" labelEn="Brand color" />
            <input
              type="text"
              value={s.brandColor}
              onChange={(e) => update("brandColor", e.target.value)}
              placeholder="예시: 블럭스 기본 — #006FFD (blue) and #0a192f (navy)"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              색상 이름이나 HEX 코드를 입력할 수 있습니다.
            </p>
          </div>

          {/* 슬라이드 장식 */}
          <div>
            <FieldLabel label="슬라이드 장식" labelEn="Slide decoration" />
            <div className="space-y-2">
              {[
                {
                  key: "showPageNumber" as const,
                  label: '페이지 번호 넣기',
                  desc: '예: "1/4" 형식으로 눈에 띄지 않게 배치합니다.',
                },
                {
                  key: "showFooterTitle" as const,
                  label: "Footer 에 슬라이드 제목 반복하기",
                  desc: "덱 제목을 하단 푸터에 반복해 연속성을 만듭니다.",
                },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s[key]}
                    onChange={(e) => update(key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#152439] accent-[#152439]"
                  />
                  <div>
                    <p className="text-sm text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 레이아웃 */}
          <div>
            <FieldLabel label="레이아웃" labelEn="Layout" />
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs text-gray-500">
                  커버 메시지 위치{" "}
                  <span className="text-gray-300">(Default: Left)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["왼쪽", "오른쪽"] as const).map((pos) => (
                    <ToggleButton
                      key={pos}
                      active={s.coverPosition === pos}
                      onClick={() => update("coverPosition", pos)}
                    >
                      <span className="font-medium">{pos}</span>
                      <br />
                      <span className="text-xs font-normal opacity-70">
                        {pos === "왼쪽"
                          ? "메시지는 왼쪽, 비주얼은 오른쪽"
                          : "메시지는 오른쪽, 비주얼은 왼쪽"}
                      </span>
                    </ToggleButton>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-gray-500">
                  요약 페이지 레이아웃{" "}
                  <span className="text-gray-300">
                    (Default: Split left and right)
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        val: "좌우 분할" as const,
                        desc: "Left: Message / Right: Next Action",
                      },
                      {
                        val: "상하 2단" as const,
                        desc: "Top: Message / Bottom: Next Action",
                      },
                    ] as const
                  ).map(({ val, desc }) => (
                    <ToggleButton
                      key={val}
                      active={s.summaryLayout === val}
                      onClick={() => update("summaryLayout", val)}
                    >
                      <span className="font-medium">{val}</span>
                      <br />
                      <span className="text-xs font-normal opacity-70">
                        {desc}
                      </span>
                    </ToggleButton>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 크레딧 */}
          <div>
            <FieldLabel label="크레딧 정보" labelEn="Credit information" />
            <p className="mb-2 text-xs text-gray-400">
              빈 항목은 프롬프트에 넣지 않습니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "authorName" as const, label: "작성자 Name", placeholder: "예시: Blux Growth Team" },
                { key: "company" as const, label: "소속 Company", placeholder: "예시: Blux" },
                { key: "date" as const, label: "날짜 date", placeholder: "예시: June 2026" },
                { key: "contact" as const, label: "연락처 Contact", placeholder: "예시: blux.ai / hello@blux.ai" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block mb-1.5 text-xs font-medium text-gray-500">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={s[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div>
            <FieldLabel label="마지막 페이지 CTA" />
            <input
              type="text"
              value={s.cta}
              onChange={(e) => update("cta", e.target.value)}
              placeholder="예시: 지금 바로 무료 체험 → blux.ai / 데모 신청하기 → 링크 삽입"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              작성자, 소속, 날짜는 커버에, 연락처와 CTA는 마지막 페이지에
              배치됩니다.
            </p>
          </div>

          {/* 추가 지시사항 */}
          <div>
            <FieldLabel label="추가 지시사항" labelEn="Additional instructions" />
            <textarea
              value={s.additionalInstructions}
              onChange={(e) => update("additionalInstructions", e.target.value)}
              placeholder="예시: 블럭스 UI 스크린샷 포함 / 전후 비교 다이어그램 선호 / 지표는 전환율·재구매율 중심으로"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
            />
          </div>
        </div>
      </section>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
            !canGenerate
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-[#152439] text-white shadow-sm hover:bg-[#1e3353] active:scale-[0.99]"
          )}
        >
          <Sparkles className="h-4 w-4" />
          프롬프트 생성
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </button>
      </div>
      </div>{/* end 좌측 설정 패널 */}

      {/* ── 우측 프롬프트 패널 (sticky) ──────────────────────────── */}
      <div className="w-[380px] shrink-0 sticky top-[105px] self-start">
        {prompt ? (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  생성된 프롬프트
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  ChatGPT 또는 Claude에 붙여넣기 하세요.
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  copied
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    복사
                  </>
                )}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words px-5 py-5 text-sm leading-relaxed text-gray-700 font-sans max-h-[calc(100vh-160px)] overflow-y-auto">
              {prompt}
            </pre>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-16 text-center">
            <Sparkles className="h-6 w-6 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              슬라이드 수와 시각 스타일을 선택한 뒤
              <br />
              "프롬프트 생성"을 눌러주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Style preview tiles ──────────────────────────────────────────────────────

function StylePreview({ id }: { id: VisualStyle }) {
  if (id === "navy-dark") {
    return (
      <div className="w-48 h-16 bg-[#0a192f] flex items-center px-5 gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-1 w-6 bg-[#006ffd]" />
          <div className="h-3 w-28 bg-white" />
          <div className="h-1.5 w-20 bg-white/30" />
        </div>
        <div className="ml-auto w-8 h-8 border border-[#006ffd]/60 flex items-center justify-center shrink-0">
          <div className="w-3 h-3 bg-[#006ffd]" />
        </div>
      </div>
    );
  }
  if (id === "paper-light") {
    return (
      <div className="w-48 h-16 bg-[#f7f9fb] flex items-center px-5 gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-1 w-6 bg-[#006ffd]" />
          <div className="h-3 w-28 bg-[#0a192f]" />
          <div className="h-1.5 w-20 bg-[#0a192f]/25" />
        </div>
        <div className="ml-auto flex flex-col gap-1.5 shrink-0">
          <div className="h-1 w-10 bg-[#006ffd]/40" />
          <div className="h-1 w-8 bg-[#0a192f]/20" />
          <div className="h-1 w-10 bg-[#0a192f]/20" />
        </div>
      </div>
    );
  }
  if (id === "accent-blue") {
    return (
      <div className="w-48 h-16 bg-[#006ffd] flex items-center px-5">
        <div className="flex flex-col gap-2">
          <div className="h-1 w-6 bg-white/50" />
          <div className="h-3.5 w-32 bg-white" />
          <div className="h-1.5 w-20 bg-white/40" />
        </div>
      </div>
    );
  }
  // ink-minimal
  return (
    <div className="w-48 h-16 bg-[#0a192f] flex items-end px-5 pb-4">
      <div className="flex flex-col gap-1.5 w-full">
        <div className="h-4 w-36 bg-white" />
        <div className="h-1.5 w-16 bg-[#006ffd]" />
      </div>
    </div>
  );
}
