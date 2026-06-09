import { useState, useMemo, useId } from "react";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

// ─── S01–S22 Layout registry (matches SLIDE_DESIGN.md §9 exactly) ─────────────

type LayoutId =
  | "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07" | "S08"
  | "S09" | "S10" | "S11" | "S12" | "S13" | "S14" | "S15" | "S16"
  | "S17" | "S18" | "S19" | "S20" | "S21" | "S22";

interface Layout {
  id: LayoutId;
  name: string;
  desc: string;           // 한 줄 요약
  useWhen: string;        // 이럴 때 사용
  contentSlots: string[]; // 입력 받을 콘텐츠 슬롯 이름들
  hasImage: boolean;
  theme: "dark" | "light" | "both"; // 권장 테마
}

const LAYOUTS: Layout[] = [
  { id: "S01", name: "Index Cover",           desc: "덱/섹션 오프너 커버",                useWhen: "커버·오프너 — 굵고 여백 많고 구조적",               contentSlots: ["히어로 타이틀", "서브라인 (선택)", "태그 필 (선택)"],                          hasImage: false, theme: "dark" },
  { id: "S02", name: "Vertical Timeline + KPI",desc: "타임라인 + 실제 수치",               useWhen: "시간 흐름 + 실제 수치 신호 필요",                   contentSlots: ["슬라이드 제목", "타임라인 단계 (2~4개)", "하단 KPI 수치 (선택)"],            hasImage: false, theme: "dark" },
  { id: "S03", name: "Split Statement",        desc: "좌우 분할 강한 주장",                useWhen: "테제·챕터 선언·강한 주장",                          contentSlots: ["왼쪽 큰 아이디어", "오른쪽 짧은 설명/근거"],                               hasImage: false, theme: "both" },
  { id: "S04", name: "Six Cells",              desc: "정확히 6개 동급 아이템 그리드",       useWhen: "정확히 6개 동급 아이템 (개념/기능/원칙)",            contentSlots: ["슬라이드 제목", "셀 1~6 (각 제목 + 설명)"],                               hasImage: false, theme: "light" },
  { id: "S05", name: "Three Layers",           desc: "3단계·3레이어·3개 아이디어",          useWhen: "3단계·3레이어·3개 동급 아이디어 (설명 적당량)",      contentSlots: ["슬라이드 제목", "레이어 1~3 (각 제목 + 설명)"],                            hasImage: false, theme: "both" },
  { id: "S06", name: "KPI Tower",              desc: "4개 정량 지표 바 차트",               useWhen: "4개 정량 지표 비교 — 바 높이가 실제 데이터 반영",    contentSlots: ["슬라이드 제목", "지표 1~4 (레이블 + 수치 + 단위)"],                       hasImage: false, theme: "dark" },
  { id: "S07", name: "Horizontal Bar",         desc: "5~10개 순위/비율 값 바 차트",         useWhen: "5~10개 순위·비율 값 — 모든 바에 실제 수치 필요",     contentSlots: ["슬라이드 제목", "항목 5~10개 (레이블 + 수치 + 단위)"],                    hasImage: false, theme: "light" },
  { id: "S08", name: "Duo Compare",            desc: "Before/After · A vs B 2열 비교",     useWhen: "Before/After·Old/New·모델 A vs B — 두 열 구조적 대칭", contentSlots: ["슬라이드 제목", "왼쪽 열 제목 + 항목들", "오른쪽 열 제목 + 항목들"],      hasImage: false, theme: "both" },
  { id: "S09", name: "Dot Matrix Statement",   desc: "압축된 주장 한 줄 — 시각적 쉬어가기", useWhen: "두 번째 문장 슬라이드, 시각적 쉬어가기",            contentSlots: ["핵심 한 줄 주장"],                                                       hasImage: false, theme: "dark" },
  { id: "S10", name: "Split Closing",          desc: "덱 마지막 클로징 슬라이드",           useWhen: "덱 끝 한 번만 — 왼쪽 최종 선언, 오른쪽 테이크어웨이", contentSlots: ["왼쪽 최종 선언", "오른쪽 테이크어웨이 3가지"],                             hasImage: false, theme: "dark" },
  { id: "S11", name: "Horizontal Timeline",    desc: "4~7단계 선형 프로세스",               useWhen: "4~7단계 선형 프로세스·타임라인",                    contentSlots: ["슬라이드 제목", "단계 4~7개 (단계명 + 설명)"],                            hasImage: false, theme: "both" },
  { id: "S12", name: "Manifesto + Ink Banner", desc: "강한 주장 + 고대비 배너",             useWhen: "섹션 마무리·중반 강한 결론",                        contentSlots: ["상단 주장 텍스트", "하단 배너 강조 문구"],                                hasImage: false, theme: "both" },
  { id: "S13", name: "Three Forces",           desc: "정확히 3개 풍부한 동급 아이디어",     useWhen: "정확히 3개 풍부한 동급 아이디어 — 내부 구조 동일",   contentSlots: ["슬라이드 제목", "카드 1~3 (번호 + 제목 + 설명)"],                         hasImage: false, theme: "dark" },
  { id: "S14", name: "Loop Form",              desc: "피드백 루프·자동화 루프·반복 사이클", useWhen: "피드백 루프·자동화 루프·학습 루프·반복 사이클",      contentSlots: ["슬라이드 제목", "루프 단계 3~5개 (단계명 + 설명)"],                       hasImage: false, theme: "dark" },
  { id: "S15", name: "Matrix + Hero Stat",     desc: "8~12개 아이템 그리드 + 요약 지표",    useWhen: "8~12개 동급 아이템 + 합계/요약 지표",               contentSlots: ["슬라이드 제목", "그리드 아이템 8~12개", "하단 요약 지표"],                  hasImage: true,  theme: "both" },
  { id: "S16", name: "Multi-card Brief",       desc: "정확히 6개 간결한 카드",              useWhen: "정확히 6개 간결한 노트·팁·소형 피처 카드",           contentSlots: ["슬라이드 제목", "카드 6개 (제목 + 짧은 설명)"],                           hasImage: true,  theme: "light" },
  { id: "S17", name: "System Diagram",         desc: "3레이어 시스템/아키텍처 맵",          useWhen: "엄격한 3레이어 시스템/에코시스템/아키텍처 맵",       contentSlots: ["슬라이드 제목", "레이어 1~3 (레이어명 + 컴포넌트들)"],                     hasImage: false, theme: "dark" },
  { id: "S18", name: "Why Now",                desc: "3가지 이유 — 각각 수치/근거 필요",    useWhen: "3가지 이유 — 각각 수치나 명확한 근거 필요",          contentSlots: ["슬라이드 제목", "이유 1~3 (제목 + 설명 + 근거 수치)"],                    hasImage: false, theme: "dark" },
  { id: "S19", name: "Four Cards",             desc: "정확히 4개 동등한 피처/모듈",         useWhen: "정확히 4개 동등한 피처/모듈 — 카드 스타일 일관",     contentSlots: ["슬라이드 제목", "카드 4개 (번호 + 제목 + 설명 + KPI 선택)"],              hasImage: false, theme: "both" },
  { id: "S20", name: "Stacked KPI Ledger",     desc: "4~6개 핵심 지표 원장 형식",           useWhen: "4~6개 핵심 지표 원장 — 각 행에 숫자·레이블·맥락",   contentSlots: ["슬라이드 제목", "지표 행 4~6개 (레이블 + 수치 + 맥락)"],                  hasImage: false, theme: "dark" },
  { id: "S21", name: "Tech Spec Sheet",        desc: "제품 스펙·벤치마크 밀도 높은 기술",   useWhen: "제품 스펙·벤치마크·모델 성능·밀도 높은 기술 근거",   contentSlots: ["슬라이드 제목", "스펙 항목들 (다차원 실제 데이터 필요)"],                  hasImage: false, theme: "dark" },
  { id: "S22", name: "Image Hero",             desc: "대형 비주얼 1개 + 3개 지원 지표",     useWhen: "대형 비주얼 1개 + 3개 지원 지표 — 상단 이미지 21:9", contentSlots: ["슬라이드 제목", "이미지 설명 (21:9)", "하단 지표 3개"],                    hasImage: true,  theme: "both" },
];

// ─── Smart default layout sequence by count ──────────────────────────────────

const SLIDE_COUNTS = [4, 6, 8, 10, 12, 16, 20];

function defaultLayoutsForCount(n: number): LayoutId[] {
  const pool: LayoutId[] = [
    "S01", "S03", "S05", "S08", "S13", "S19", "S12", "S18", "S11", "S09",
    "S04", "S06", "S14", "S20", "S17", "S02", "S07", "S15", "S21", "S10",
  ];
  const result: LayoutId[] = ["S01"]; // always start with cover
  let i = 1;
  while (result.length < n - 1 && i < pool.length) {
    result.push(pool[i]);
    i++;
  }
  result.push("S10"); // always end with closing
  return result.slice(0, n);
}

// ─── Data model ───────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  layout: LayoutId;
  slideTheme: "dark" | "light" | "accent"; // per-slide theme override
  content: string; // freeform content — structured per slot labels
}

type Language = "한국어 중심" | "English main";

interface DeckState {
  title: string;
  language: Language;
  slides: Slide[];
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _counter = 0;
const nextId = () => `s${++_counter}`;

function makeSlide(id: string, layout: LayoutId = "S03"): Slide {
  const def = LAYOUTS.find((l) => l.id === layout)!;
  return {
    id,
    layout,
    slideTheme: def.theme === "light" ? "light" : "dark",
    content: "",
  };
}

const INITIAL_SLIDES: Slide[] = [
  makeSlide(nextId(), "S01"),
  makeSlide(nextId(), "S03"),
  makeSlide(nextId(), "S05"),
  makeSlide(nextId(), "S10"),
];

const INITIAL: DeckState = {
  title: "",
  language: "한국어 중심",
  slides: INITIAL_SLIDES,
};

// ─── Brief builder ─────────────────────────────────────────────────────────────

function buildBrief(d: DeckState): string {
  const header = [
    `/blux-slide-design 스킬로 아래 브리프대로 HTML 슬라이드 덱을 만들어줘.`,
    ``,
    `## 덱 설정`,
    `- 제목: ${d.title.trim() || "(미입력)"}`,
    `- 언어: ${d.language === "한국어 중심" ? "한국어 본문 + 영어 레이블/키워드" : "영어 본문 + 한국어 보조"}`,
    `- 총 슬라이드: ${d.slides.length}장`,
    `- 레이아웃 다양성 규칙 준수: ${d.slides.length >= 10 ? "최소 8가지 다른 Sxx" : "최소 6가지 다른 Sxx"} 레이아웃 사용`,
  ].join("\n");

  const slideBlocks = d.slides.map((sl, i) => {
    const layout = LAYOUTS.find((l) => l.id === sl.layout)!;
    const idx = String(i + 1).padStart(2, "0");
    const themeClass = sl.slideTheme === "dark" ? `.slide.dark` : sl.slideTheme === "accent" ? `.slide.accent` : `.slide`;
    const lines = [
      `---`,
      `## 슬라이드 ${idx} — ${sl.layout} ${layout.name}`,
      `클래스: ${themeClass}  data-layout="${sl.layout}"`,
    ];
    if (layout.contentSlots.length > 0) {
      lines.push(`콘텐츠 슬롯: ${layout.contentSlots.join(" / ")}`);
    }
    if (sl.content.trim()) {
      lines.push(``, `### 내용`);
      lines.push(sl.content.trim());
    } else {
      lines.push(``, `※ 내용 미입력 — 덱 주제(${d.title.trim() || "위 덱 제목"})에 맞게 자동 구성`);
    }
    return lines.join("\n");
  });

  // Layout diversity check
  const usedLayouts = new Set(d.slides.map((s) => s.layout));
  const diversityNote = usedLayouts.size < 4
    ? `\n⚠️ 현재 ${usedLayouts.size}가지 레이아웃만 사용 중 — 최소 6가지 권장. 스킬이 자동으로 다양성 보완 가능.`
    : "";

  return [
    header + diversityNote,
    ...slideBlocks,
    `---`,
    `## 완성 요청`,
    `위 브리프 그대로 ${d.slides.length}장 완성 덱을 한 번에 렌더링해줘.`,
    `SLIDE_DESIGN.md §0 non-negotiables 전부 준수. 같은 레이아웃 3슬라이드 연속 금지.`,
    `[강조 단어]는 <span style="color:var(--accent-bright)">강조어</span>로 처리.`,
  ].join("\n\n");
}

// ─── Sub components ───────────────────────────────────────────────────────────

function Label({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-1.5">
      <span className="text-xs font-semibold text-gray-700">{children}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10 placeholder-gray-300";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}
function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number },
) {
  return (
    <textarea
      {...props}
      className={cn(inputCls, "resize-none", props.className)}
    />
  );
}

// Layout picker dropdown
function LayoutPicker({
  value,
  onChange,
}: {
  value: LayoutId;
  onChange: (v: LayoutId) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = LAYOUTS.find((l) => l.id === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#152439] bg-[#152439]/5 px-3 py-1.5 text-xs font-semibold text-[#152439] hover:bg-[#152439]/10 transition-colors whitespace-nowrap"
      >
        <span className="text-gray-400">{sel.id}</span>
        <span>{sel.name}</span>
        <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 flex gap-3 items-start",
                  value === l.id && "bg-[#152439]/5",
                )}
              >
                <span className="font-bold text-[#006ffd] w-7 shrink-0 mt-0.5">
                  {l.id}
                </span>
                <div>
                  <div className="font-semibold text-gray-800">{l.name}</div>
                  <div className="text-gray-400 mt-0.5">{l.useWhen}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Theme badge picker
function ThemePicker({
  value,
  onChange,
}: {
  value: Slide["slideTheme"];
  onChange: (v: Slide["slideTheme"]) => void;
}) {
  return (
    <div className="flex gap-1">
      {(
        [
          ["dark", "Dark", "bg-[#0a192f]"],
          ["light", "Light", "bg-[#f7f9fb] border border-gray-300"],
          ["accent", "Accent", "bg-[#006ffd]"],
        ] as const
      ).map(([val, label, color]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          title={label}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-all",
            value === val
              ? "border-[#152439] bg-[#152439]/10 font-semibold text-[#152439]"
              : "border-gray-200 text-gray-500 hover:border-gray-300",
          )}
        >
          <span className={cn("w-3 h-3 shrink-0", color)} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Slide card ───────────────────────────────────────────────────────────────

function SlideCard({
  slide,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  slide: Slide;
  index: number;
  total: number;
  onUpdate: (id: string, p: Partial<Slide>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const [open, setOpen] = useState(index < 3);
  const layout = LAYOUTS.find((l) => l.id === slide.layout)!;
  const upd = (p: Partial<Slide>) => onUpdate(slide.id, p);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        <span className="w-6 shrink-0 text-xs font-bold text-gray-300">
          {String(index + 1).padStart(2, "0")}
        </span>
        <LayoutPicker
          value={slide.layout}
          onChange={(v) => {
            const def = LAYOUTS.find((l) => l.id === v)!;
            upd({ layout: v, slideTheme: def.theme === "light" ? "light" : "dark" });
          }}
        />
        <ThemePicker
          value={slide.slideTheme}
          onChange={(v) => upd({ slideTheme: v })}
        />
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onMoveUp(slide.id)}
            disabled={index === 0}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(slide.id)}
            disabled={index === total - 1}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRemove(slide.id)}
            disabled={total <= 1}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors ml-1"
          >
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* expanded fields */}
      {open && (
        <div className="px-5 py-4 space-y-3">
          {/* slot guide */}
          <div className="flex flex-wrap gap-1.5">
            {layout.contentSlots.map((slot) => (
              <span
                key={slot}
                className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
              >
                {slot}
              </span>
            ))}
            {layout.hasImage && (
              <span className="inline-flex items-center rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-500">
                이미지 슬롯 21:9
              </span>
            )}
          </div>
          {/* content textarea */}
          <div>
            <Label sub="슬롯 레이블을 앞에 써서 구분 · [강조어]는 대괄호">
              내용
            </Label>
            <Textarea
              rows={5}
              value={slide.content}
              onChange={(e) => upd({ content: e.target.value })}
              placeholder={layout.contentSlots
                .map((slot) => `${slot}:\n`)
                .join("")
                .trim()}
            />
          </div>
          <p className="text-xs text-gray-400">
            {layout.desc} — <span className="text-gray-500">{layout.useWhen}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SlideDesignBrief() {
  const [deck, setDeck] = useState<DeckState>(INITIAL);
  const [copied, setCopied] = useState(false);
  const uid = useId();

  const updateDeck = <K extends keyof DeckState>(k: K, v: DeckState[K]) =>
    setDeck((prev) => ({ ...prev, [k]: v }));

  const updateSlide = (id: string, patch: Partial<Slide>) =>
    setDeck((prev) => ({
      ...prev,
      slides: prev.slides.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
    }));

  const removeSlide = (id: string) =>
    setDeck((prev) => ({
      ...prev,
      slides: prev.slides.filter((sl) => sl.id !== id),
    }));

  const addSlide = () =>
    setDeck((prev) => ({
      ...prev,
      slides: [...prev.slides, makeSlide(nextId(), "S03")],
    }));

  const moveSlide = (id: string, dir: -1 | 1) =>
    setDeck((prev) => {
      const slides = [...prev.slides];
      const i = slides.findIndex((s) => s.id === id);
      const j = i + dir;
      if (j < 0 || j >= slides.length) return prev;
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...prev, slides };
    });

  const handleSlideCount = (n: number) =>
    setDeck((prev) => {
      if (n === prev.slides.length) return prev;
      if (n > prev.slides.length) {
        const templates = defaultLayoutsForCount(n);
        const extra = Array.from({ length: n - prev.slides.length }, (_, i) =>
          makeSlide(nextId(), templates[prev.slides.length + i] ?? "S03"),
        );
        return { ...prev, slides: [...prev.slides, ...extra] };
      }
      return { ...prev, slides: prev.slides.slice(0, n) };
    });

  const brief = useMemo(() => buildBrief(deck), [deck]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Layout diversity warning
  const usedLayouts = new Set(deck.slides.map((s) => s.layout));
  const minDiversity = deck.slides.length >= 10 ? 8 : 6;
  const diversityOk = usedLayouts.size >= Math.min(minDiversity, deck.slides.length);

  return (
    <div className="flex gap-6 items-start">
      {/* ── 좌측 폼 ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* 안내 배너 */}
        <div className="rounded-xl bg-[#0a192f] px-5 py-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-[#006ffd] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[9px] font-bold text-white">SD</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              /blux-slide-design 스킬 전용 브리프 생성기
            </p>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              S01–S22 레이아웃 선택 → 내용 입력 → 브리프 복사 → Claude에서{" "}
              <code className="bg-white/10 px-1.5 rounded text-white/80">
                /blux-slide-design
              </code>{" "}
              실행 후 붙여넣기
            </p>
          </div>
        </div>

        {/* ── 덱 설정 ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-bold text-[#152439] mb-5">덱 설정</h2>
          <div className="space-y-4">
            <div>
              <Label>덱 제목</Label>
              <Input
                id={`${uid}-title`}
                value={deck.title}
                onChange={(e) => updateDeck("title", e.target.value)}
                placeholder="예: Blux CRM 서비스 소개 / 이커머스 마케팅 자동화 전략"
              />
            </div>
            <div>
              <Label>언어</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["한국어 중심", "KO — 한국어 본문 + 영어 키워드"],
                    ["English main", "EN — 영어 본문 + 한국어 보조"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => updateDeck("language", val)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      deck.language === val
                        ? "border-[#152439] bg-[#152439]/5 text-[#152439]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label sub="선택하면 슬라이드 목록 자동 구성">슬라이드 수</Label>
              <div className="flex flex-wrap items-center gap-2">
                {SLIDE_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSlideCount(n)}
                    className={cn(
                      "h-9 min-w-[2.5rem] rounded-lg border px-3 text-sm font-medium transition-all",
                      deck.slides.length === n
                        ? "border-[#152439] bg-[#152439] text-white"
                        : "border-gray-200 bg-white hover:border-gray-300 text-gray-700",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-xs text-gray-400">
                  현재 {deck.slides.length}장
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* diversity warning */}
        {!diversityOk && deck.slides.length >= 4 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-base mt-0.5">⚠️</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              현재 <strong>{usedLayouts.size}가지</strong> 레이아웃 사용 중 —
              {deck.slides.length}장 덱은 최소{" "}
              <strong>{minDiversity}가지</strong> 권장. 중복 레이아웃을 다른
              Sxx로 교체해보세요.
            </p>
          </div>
        )}

        {/* ── 슬라이드 목록 ───────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#152439]">
              슬라이드 구성
            </h2>
            <span className="text-xs text-gray-400">
              {usedLayouts.size}가지 레이아웃 사용
            </span>
          </div>
          {deck.slides.map((sl, i) => (
            <SlideCard
              key={sl.id}
              slide={sl}
              index={i}
              total={deck.slides.length}
              onUpdate={updateSlide}
              onRemove={removeSlide}
              onMoveUp={(id) => moveSlide(id, -1)}
              onMoveDown={(id) => moveSlide(id, 1)}
            />
          ))}
          <button
            onClick={addSlide}
            className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-[#006ffd] hover:text-[#006ffd] hover:bg-[#006ffd]/5 transition-all"
          >
            <Plus className="h-4 w-4" />
            슬라이드 추가
          </button>
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="flex gap-2 pb-8">
          <button
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-[#0a192f] text-white shadow-sm hover:bg-[#152439] active:scale-[0.99] transition-all"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                브리프 복사됨
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                브리프 복사
              </>
            )}
          </button>
          <button
            onClick={() => setDeck(INITIAL)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </button>
        </div>
      </div>

      {/* ── 우측 브리프 프리뷰 ──────────────────────────────────── */}
      <div className="w-[420px] shrink-0 sticky top-[105px] self-start">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">생성된 브리프</p>
              <p className="text-xs text-gray-400 mt-0.5">
                복사 →{" "}
                <code className="bg-gray-100 px-1 rounded">
                  /blux-slide-design
                </code>
              </p>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                copied
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
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
          <pre className="whitespace-pre-wrap break-words px-5 py-5 text-xs leading-relaxed text-gray-700 font-mono max-h-[calc(100vh-200px)] overflow-y-auto">
            {brief}
          </pre>
        </div>
      </div>
    </div>
  );
}
