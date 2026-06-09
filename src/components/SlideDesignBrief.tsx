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

// ─── Template vocabulary (matches SLIDE_DESIGN.md exactly) ───────────────────

type TemplateId =
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

const TEMPLATES: {
  id: TemplateId;
  label: string;
  desc: string;
  hasChrome: boolean;
}[] = [
  {
    id: "title",
    label: "Title",
    desc: "덱 표지 — 크롬 없음",
    hasChrome: false,
  },
  {
    id: "agenda",
    label: "Agenda",
    desc: "목차 / 섹션 로드맵",
    hasChrome: true,
  },
  {
    id: "section-divider",
    label: "Section Divider",
    desc: "챕터 전환 구분자",
    hasChrome: true,
  },
  {
    id: "content-standard",
    label: "Content — Standard",
    desc: "H1 + 단락/목록/KPI 범용형",
    hasChrome: true,
  },
  {
    id: "two-column",
    label: "Content — Two Column",
    desc: "텍스트 + 비주얼 나란히",
    hasChrome: true,
  },
  {
    id: "three-up-card",
    label: "Content — Three-up Card",
    desc: "동급 3개 카드",
    hasChrome: true,
  },
  {
    id: "pain-grid",
    label: "Content — Pain Grid",
    desc: "문제점 4-6개 그리드",
    hasChrome: true,
  },
  {
    id: "comparison-table",
    label: "Content — Comparison Table",
    desc: "Blux vs 경쟁사 매트릭스",
    hasChrome: true,
  },
  {
    id: "before-after",
    label: "Content — Before / After",
    desc: "기존(빨강) vs 블럭스(파랑)",
    hasChrome: true,
  },
  {
    id: "conversation",
    label: "Content — Conversation",
    desc: "User → Agent 대화 카드 최대 4개",
    hasChrome: true,
  },
  {
    id: "end",
    label: "End",
    desc: "CTA / 감사 클로저 — 크롬 없음",
    hasChrome: false,
  },
];

// ─── Slide data model ────────────────────────────────────────────────────────
// Flat union — all fields present; only template-relevant ones used

interface CardItem {
  title: string;
  body: string;
}
interface CompRow {
  criteria: string;
  values: string[];
}
interface ConvCard {
  context: string;
  user: string;
  agent: string;
}

interface Slide {
  id: string;
  template: TemplateId;
  sectionName: string; // chrome top-left

  // ── title ──────────────────────────────────────────────────
  titleH1: string; // main headline; wrap [accent phrase] in square brackets
  titleSubtitle: string; // sub-line under H1
  titleTagPill: string; // e.g. "CRM SOLUTION · 2026"
  titleCredits: string; // "발표자 · 소속 · 날짜"

  // ── agenda ─────────────────────────────────────────────────
  agendaCurrent: string; // highlighted section name (blank = TOC, all equal)

  // ── section-divider ────────────────────────────────────────
  dividerH1: string;
  dividerSubThesis: string;

  // ── content-standard ───────────────────────────────────────
  stdH1: string;
  stdSubhead: string;
  stdBodyPattern: "paragraph" | "numbered-list" | "kpi-cards";
  stdBody: string; // paragraph: text; numbered-list: one item per line; kpi-cards: "레이블|수치|변화" per line
  stdFooter: string;

  // ── two-column ──────────────────────────────────────────────
  twoH1: string;
  twoSubhead: string;
  twoLeft: string; // 좌측 텍스트 / 번호 목록
  twoRight: string; // 우측 비주얼 설명 (어떤 목업/다이어그램)

  // ── three-up-card ───────────────────────────────────────────
  threeH1: string;
  threeSubhead: string;
  threeCards: CardItem[]; // exactly 3

  // ── pain-grid ───────────────────────────────────────────────
  painH1: string;
  painSubhead: string;
  painItems: CardItem[]; // 4–6

  // ── comparison-table ────────────────────────────────────────
  compH1: string;
  compSubhead: string;
  compColumns: string[]; // ["BLUX", "Braze", "Insider", …]
  compRows: CompRow[]; // each row: criteria + values[0..N-1]; rating: "●●●" / "●●○" / "●○○"

  // ── before-after ────────────────────────────────────────────
  baH1: string;
  baSubhead: string;
  baBeforeLabel: string;
  baBeforeItems: string[]; // one item per entry; pain keyword goes in [brackets]
  baAfterLabel: string;
  baAfterItems: string[]; // same; accent word in [brackets]
  baFooter: string;

  // ── conversation ────────────────────────────────────────────
  convH1: string;
  convSubhead: string;
  convCards: ConvCard[]; // max 4

  // ── end ─────────────────────────────────────────────────────
  endVariant: "cta" | "thanks";
  endH1: string;
  endLinks: string[]; // CTA용 링크 텍스트 (최대 3)
  endContact: string;
}

type Language = "한국어 중심" | "English main";
type DeckTheme = "dark" | "light";

interface DeckState {
  title: string;
  theme: DeckTheme;
  language: Language;
  sections: string; // newline-separated section names
  slides: Slide[];
}

// ─── Smart default templates by count ────────────────────────────────────────

const SLIDE_COUNTS = [4, 6, 8, 10, 12, 16, 20];

function defaultTemplatesForCount(n: number): TemplateId[] {
  if (n <= 3) return (["title", "content-standard", "end"] as TemplateId[]).slice(0, n);
  // Always: title, agenda at start; end at finish
  // Fill middle with content-standard; insert section-divider every ~4 slides if room
  const middle = n - 3; // excluding title, agenda, end
  const result: TemplateId[] = ["title", "agenda"];
  for (let i = 0; i < middle; i++) {
    // Every 4th content slide, insert a section-divider (if middle is large enough)
    if (middle >= 6 && i > 0 && i % 4 === 0) {
      result.push("section-divider");
    } else {
      result.push("content-standard");
    }
  }
  result.push("end");
  return result.slice(0, n);
}

// ─── Default slide factory ────────────────────────────────────────────────────

function makeSlide(
  id: string,
  template: TemplateId = "content-standard",
): Slide {
  return {
    id,
    template,
    sectionName: "",
    titleH1: "",
    titleSubtitle: "",
    titleTagPill: "",
    titleCredits: "",
    agendaCurrent: "",
    dividerH1: "",
    dividerSubThesis: "",
    stdH1: "",
    stdSubhead: "",
    stdBodyPattern: "paragraph",
    stdBody: "",
    stdFooter: "",
    twoH1: "",
    twoSubhead: "",
    twoLeft: "",
    twoRight: "",
    threeH1: "",
    threeSubhead: "",
    threeCards: [
      { title: "", body: "" },
      { title: "", body: "" },
      { title: "", body: "" },
    ],
    painH1: "",
    painSubhead: "",
    painItems: [
      { title: "", body: "" },
      { title: "", body: "" },
      { title: "", body: "" },
      { title: "", body: "" },
    ],
    compH1: "",
    compSubhead: "",
    compColumns: ["BLUX", "", ""],
    compRows: [{ criteria: "", values: ["", "", ""] }],
    baH1: "",
    baSubhead: "",
    baBeforeLabel: "기존",
    baBeforeItems: ["", "", ""],
    baAfterLabel: "블럭스 이후",
    baAfterItems: ["", "", ""],
    baFooter: "",
    convH1: "",
    convSubhead: "",
    convCards: [{ context: "", user: "", agent: "" }],
    endVariant: "cta",
    endH1: "",
    endLinks: ["", ""],
    endContact: "",
  };
}

let _counter = 0;
const nextId = () => `s${++_counter}`;

const INITIAL_SLIDES: Slide[] = [
  {
    ...makeSlide(nextId(), "title"),
    titleH1: "여기에 [강조 키워드] 포함된 슬라이드 제목",
  },
  { ...makeSlide(nextId(), "agenda") },
  {
    ...makeSlide(nextId(), "content-standard"),
    sectionName: "섹션 이름",
    stdH1: "슬라이드 [핵심 메시지]",
  },
  { ...makeSlide(nextId(), "end"), endVariant: "cta" },
];

const INITIAL: DeckState = {
  title: "",
  theme: "dark",
  language: "한국어 중심",
  sections: "",
  slides: INITIAL_SLIDES,
};

// ─── Brief builder ─────────────────────────────────────────────────────────────

function buildBrief(d: DeckState): string {
  const sectionList = d.sections
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const header = [
    `/blux-slide-design 스킬로 아래 브리프대로 HTML 슬라이드 덱을 만들어줘.`,
    ``,
    `## 덱 설정`,
    `- 제목: ${d.title.trim() || "(미입력)"}`,
    `- 테마: ${d.theme === "dark" ? "Dark (네이비 배경 — 기본)" : "Light (밝은 배경)"}`,
    `- 언어: ${d.language === "한국어 중심" ? "한국어 본문 + 영어 레이블/키워드" : "영어 본문 + 한국어 보조"}`,
    ...(sectionList.length
      ? [`- 섹션: ${sectionList.map((s, i) => `${i + 1}. ${s}`).join("  ")}`]
      : []),
  ].join("\n");

  const slideBlocks = d.slides.map((sl, i) => {
    const idx = String(i + 1).padStart(2, "0");
    const tmpl = TEMPLATES.find((t) => t.id === sl.template);
    const lines: string[] = [
      `---`,
      `## 슬라이드 ${idx} — ${tmpl?.label ?? sl.template}`,
    ];
    if (sl.sectionName.trim())
      lines.push(`섹션명 (크롬 좌상단): ${sl.sectionName.trim()}`);

    switch (sl.template) {
      case "title":
        if (sl.titleTagPill.trim())
          lines.push(`태그 필: ${sl.titleTagPill.trim()}`);
        lines.push(`H1: ${sl.titleH1.trim() || "(제목 미입력)"}`);
        if (sl.titleSubtitle.trim())
          lines.push(`부제: ${sl.titleSubtitle.trim()}`);
        if (sl.titleCredits.trim())
          lines.push(`크레딧: ${sl.titleCredits.trim()}`);
        lines.push(
          `※ H1에서 [괄호 안] 텍스트를 Secondary/600 파란색 강조로 처리`,
        );
        break;

      case "agenda":
        lines.push(`패턴: Variant A (전체 섹션 표시, 현재 섹션 Bold 강조)`);
        if (sectionList.length) {
          lines.push(`섹션 목록:`);
          sectionList.forEach((s, i) => {
            const isCurrent = sl.agendaCurrent.trim() === s;
            lines.push(
              `  ${i + 1}. ${s}${isCurrent ? "  ← 현재 (Bold 강조)" : ""}`,
            );
          });
        } else {
          lines.push(`※ 위 덱 설정의 섹션 목록을 그대로 사용`);
          if (sl.agendaCurrent.trim())
            lines.push(`현재 강조 섹션: ${sl.agendaCurrent.trim()}`);
        }
        break;

      case "section-divider":
        lines.push(`섹션 헤드라인: ${sl.dividerH1.trim() || "(미입력)"}`);
        if (sl.dividerSubThesis.trim())
          lines.push(`서브 테제: ${sl.dividerSubThesis.trim()}`);
        if (sl.sectionName.trim())
          lines.push(
            `※ 크롬 + 슬라이드 바디 모두 "${sl.sectionName.trim()}" 섹션명 사용`,
          );
        break;

      case "content-standard":
        lines.push(`H1: ${sl.stdH1.trim() || "(미입력)"}`);
        if (sl.stdSubhead.trim())
          lines.push(`Subhead: ${sl.stdSubhead.trim()}`);
        lines.push(
          `바디 패턴: ${
            sl.stdBodyPattern === "paragraph"
              ? "단락 (§8.6 body pattern 1)"
              : sl.stdBodyPattern === "numbered-list"
                ? "번호 목록 (§8.6 body pattern 3)"
                : "KPI 카드 funnel row (§8.6 body pattern 4)"
          }`,
        );
        if (sl.stdBody.trim()) {
          if (sl.stdBodyPattern === "paragraph") {
            lines.push(`바디 내용:\n  ${sl.stdBody.trim()}`);
          } else if (sl.stdBodyPattern === "numbered-list") {
            const items = sl.stdBody
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            lines.push(`번호 목록 항목:`);
            items.forEach((item, i) => lines.push(`  ${i + 1}. ${item}`));
          } else {
            const items = sl.stdBody
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            lines.push(`KPI 카드 (레이블 | 수치 | 변화량):`);
            items.forEach((item) => lines.push(`  - ${item}`));
          }
        }
        if (sl.stdFooter.trim())
          lines.push(`Footer Claim: ${sl.stdFooter.trim()}`);
        lines.push(`※ H1에서 [괄호 안] 텍스트를 text.accent 파란색으로 처리`);
        break;

      case "two-column":
        lines.push(`H1: ${sl.twoH1.trim() || "(미입력)"}`);
        if (sl.twoSubhead.trim())
          lines.push(`Subhead: ${sl.twoSubhead.trim()}`);
        if (sl.twoLeft.trim()) {
          lines.push(`좌측 (텍스트, col 1-6):`);
          sl.twoLeft
            .split("\n")
            .filter(Boolean)
            .forEach((l) => lines.push(`  ${l.trim()}`));
        }
        if (sl.twoRight.trim()) {
          lines.push(`우측 (비주얼, col 7-12):`);
          lines.push(`  ${sl.twoRight.trim()}`);
        }
        lines.push(`※ H1에서 [괄호 안] 텍스트를 text.accent 파란색으로 처리`);
        break;

      case "three-up-card":
        lines.push(`H1: ${sl.threeH1.trim() || "(미입력)"}`);
        if (sl.threeSubhead.trim())
          lines.push(`Subhead: ${sl.threeSubhead.trim()}`);
        sl.threeCards.slice(0, 3).forEach((c, i) => {
          lines.push(`\n카드 ${i + 1}: ${c.title.trim() || "(제목 미입력)"}`);
          if (c.body.trim()) lines.push(`  ${c.body.trim()}`);
        });
        lines.push(`※ H1에서 [괄호 안] 텍스트를 text.accent 파란색으로 처리`);
        break;

      case "pain-grid":
        lines.push(`H1: ${sl.painH1.trim() || "(미입력)"}`);
        if (sl.painSubhead.trim())
          lines.push(`Subhead: ${sl.painSubhead.trim()}`);
        lines.push(
          `※ [괄호 안] 텍스트를 text.pain 빨간색 강조로 처리 (pain-keyword)`,
        );
        sl.painItems.forEach((p, i) => {
          if (!p.title.trim() && !p.body.trim()) return;
          lines.push(`\n페인 ${i + 1}: ${p.title.trim() || "(제목 미입력)"}`);
          if (p.body.trim()) lines.push(`  ${p.body.trim()}`);
        });
        break;

      case "comparison-table":
        lines.push(`H1: ${sl.compH1.trim() || "(미입력)"}`);
        if (sl.compSubhead.trim())
          lines.push(`Subhead: ${sl.compSubhead.trim()}`);
        {
          const cols = sl.compColumns.filter(Boolean);
          if (cols.length)
            lines.push(
              `컬럼: ${cols.join(" | ")}  (첫 번째 컬럼 = BLUX 강조 Featured 컬럼)`,
            );
          if (sl.compRows.length) {
            lines.push(`평가 행 (기준 | ${cols.join(" | ")}):`);
            sl.compRows.forEach((row) => {
              if (!row.criteria.trim()) return;
              lines.push(
                `  - ${row.criteria.trim()}: ${row.values.slice(0, cols.length).join(" | ")}`,
              );
            });
          }
          lines.push(`※ 평점 표기: ●●● 우수 / ●●○ 보통 / ●○○ 제한적`);
        }
        break;

      case "before-after":
        lines.push(`H1: ${sl.baH1.trim() || "(미입력)"}`);
        if (sl.baSubhead.trim()) lines.push(`Subhead: ${sl.baSubhead.trim()}`);
        lines.push(`\n기존 카드 레이블: ${sl.baBeforeLabel.trim() || "기존"}`);
        sl.baBeforeItems.forEach((item) => {
          if (item.trim())
            lines.push(`  - ${item.trim()}  ← [괄호 안] = text.pain 빨간색`);
        });
        lines.push(
          `\n블럭스 카드 레이블: ${sl.baAfterLabel.trim() || "블럭스 이후"}`,
        );
        sl.baAfterItems.forEach((item) => {
          if (item.trim())
            lines.push(`  - ${item.trim()}  ← [괄호 안] = text.accent 파란색`);
        });
        if (sl.baFooter.trim())
          lines.push(`\nFooter Claim: ${sl.baFooter.trim()}`);
        break;

      case "conversation":
        lines.push(`H1: ${sl.convH1.trim() || "(미입력)"}`);
        if (sl.convSubhead.trim())
          lines.push(`Subhead: ${sl.convSubhead.trim()}`);
        sl.convCards.forEach((c, i) => {
          if (!c.user.trim() && !c.agent.trim()) return;
          lines.push(
            `\n대화 카드 ${i + 1}${c.context.trim() ? ` (${c.context.trim()})` : ""}:`,
          );
          if (c.user.trim()) lines.push(`  USER: ${c.user.trim()}`);
          if (c.agent.trim()) lines.push(`  BLUX AGENT: ${c.agent.trim()}`);
        });
        lines.push(`※ Agent 응답에서 [괄호 안] = text.accent 파란색 강조`);
        break;

      case "end":
        lines.push(
          `바리에이션: ${sl.endVariant === "cta" ? "CTA (slide.end.cta — 라이트 배경 + 연락처 스트립)" : "Thanks (slide.end.thanks — 감사 클로저)"}`,
        );
        lines.push(
          `H1: ${sl.endH1.trim() || "(미입력)"}  ← [괄호 안] = text.accent 파란색`,
        );
        if (sl.endVariant === "cta") {
          const links = sl.endLinks.filter(Boolean);
          if (links.length) {
            lines.push(`CTA 링크 (→ 화살표와 함께 표시):`);
            links.forEach((l) => lines.push(`  - ${l.trim()}`));
          }
          if (sl.endContact.trim())
            lines.push(`연락처 스트립: ${sl.endContact.trim()}`);
        }
        break;
    }

    return lines.join("\n");
  });

  return [
    header,
    ...slideBlocks,
    `---`,
    `## 완성 요청`,
    `위 브리프 그대로 ${d.slides.length}장 완성 덱을 한 번에 렌더링해줘. 슬라이드 간 H1 y좌표·크롬·타이포 스펙은 SLIDE_DESIGN.md §5.7 y-skeleton 기준을 따를 것.`,
  ].join("\n\n");
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function Label({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs font-semibold text-gray-700">{children}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10 placeholder-gray-300";
const textareaCls = `${inputCls} resize-none`;

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}
function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number },
) {
  return <textarea {...props} className={cn(textareaCls, props.className)} />;
}

function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateId;
  onChange: (v: TemplateId) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = TEMPLATES.find((t) => t.id === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#152439] bg-[#152439]/5 px-3 py-1.5 text-xs font-semibold text-[#152439] hover:bg-[#152439]/10 transition-colors"
      >
        <span>{sel?.label}</span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 flex flex-col gap-0.5",
                  value === t.id && "bg-[#152439]/5",
                )}
              >
                <span className="font-semibold text-gray-800">{t.label}</span>
                <span className="text-gray-400">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Per-template form sections ───────────────────────────────────────────────

function TitleFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-[#006ffd]/5 border border-[#006ffd]/20 px-3 py-2 text-xs text-[#006ffd]">
        <strong>[강조 단어]</strong> — H1에서 파란색으로 강조할 키워드를
        대괄호로 감싸세요. 예:{" "}
        <code className="bg-[#006ffd]/10 px-1 rounded">
          고객 여정을 자동화하는 [AI CRM]
        </code>
      </div>
      <Field>
        <Label>태그 필 (선택)</Label>
        <Input
          value={sl.titleTagPill}
          onChange={(e) => upd({ titleTagPill: e.target.value })}
          placeholder="예: CRM SOLUTION · 2026"
        />
      </Field>
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1 헤드라인</Label>
        <Input
          value={sl.titleH1}
          onChange={(e) => upd({ titleH1: e.target.value })}
          placeholder="예: 고객 여정을 자동화하는 [AI CRM]"
        />
      </Field>
      <Field>
        <Label>부제 (선택)</Label>
        <Input
          value={sl.titleSubtitle}
          onChange={(e) => upd({ titleSubtitle: e.target.value })}
          placeholder="예: 블럭스 서비스 소개 · 2026 상반기"
        />
      </Field>
      <Field>
        <Label>크레딧 (선택)</Label>
        <Input
          value={sl.titleCredits}
          onChange={(e) => upd({ titleCredits: e.target.value })}
          placeholder="예: Blux Growth Team · 2026년 6월"
        />
      </Field>
    </div>
  );
}

function AgendaFields({
  sl,
  upd,
  deckSections,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
  deckSections: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
        섹션 목록은 덱 설정의 <strong>섹션 구성</strong>에서 가져옵니다.
        {deckSections.length === 0 && (
          <span className="text-orange-500 ml-1">
            ↑ 섹션을 먼저 입력해주세요.
          </span>
        )}
      </div>
      {deckSections.length > 0 && (
        <div className="space-y-1">
          {deckSections.map((s) => (
            <label key={s} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={`agenda-current-${sl.id}`}
                value={s}
                checked={sl.agendaCurrent === s}
                onChange={() => upd({ agendaCurrent: s })}
                className="accent-[#006ffd]"
              />
              <span className="text-sm">{s}</span>
            </label>
          ))}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name={`agenda-current-${sl.id}`}
              value=""
              checked={sl.agendaCurrent === ""}
              onChange={() => upd({ agendaCurrent: "" })}
              className="accent-[#006ffd]"
            />
            <span className="text-sm text-gray-400">강조 없음 (전체 TOC)</span>
          </label>
        </div>
      )}
    </div>
  );
}

function DividerFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field>
        <Label>섹션 헤드라인</Label>
        <Input
          value={sl.dividerH1}
          onChange={(e) => upd({ dividerH1: e.target.value })}
          placeholder="예: 블럭스가 만드는 새로운 CRM"
        />
      </Field>
      <Field>
        <Label>서브 테제 (선택)</Label>
        <Textarea
          rows={2}
          value={sl.dividerSubThesis}
          onChange={(e) => upd({ dividerSubThesis: e.target.value })}
          placeholder="예: 메시지 하나로 고객의 전체 여정을 설계합니다"
        />
      </Field>
    </div>
  );
}

function StandardFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.stdH1}
          onChange={(e) => upd({ stdH1: e.target.value })}
          placeholder="예: [AI 오디언스]로 전환율을 3배 높이다"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.stdSubhead}
          onChange={(e) => upd({ stdSubhead: e.target.value })}
          placeholder="예: 고객 행동 기반으로 자동 추출되는 오디언스"
        />
      </Field>
      <Field>
        <Label>바디 패턴</Label>
        <div className="flex gap-2">
          {(
            [
              ["paragraph", "단락"],
              ["numbered-list", "번호 목록"],
              ["kpi-cards", "KPI 카드"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => upd({ stdBodyPattern: val })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                sl.stdBodyPattern === val
                  ? "border-[#152439] bg-[#152439] text-white"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <Field>
        <Label
          sub={
            sl.stdBodyPattern === "paragraph"
              ? "본문 텍스트"
              : sl.stdBodyPattern === "numbered-list"
                ? "항목 1개당 1줄"
                : "레이블|수치|변화량  (줄마다 카드 1개)"
          }
        >
          바디 내용
        </Label>
        <Textarea
          rows={4}
          value={sl.stdBody}
          onChange={(e) => upd({ stdBody: e.target.value })}
          placeholder={
            sl.stdBodyPattern === "paragraph"
              ? "예: 블럭스는 오픈율·클릭률·전환율을 실시간으로 분석해 다음 메시지를 자동으로 최적화합니다."
              : sl.stdBodyPattern === "numbered-list"
                ? "예:\n실시간 행동 기반 타겟팅\n채널 통합 자동화\n성과 분석 대시보드"
                : "예:\n재구매율|+38%|▲ 3.2%p\n이탈 방어율|+61%|▲ 8.4%p\nLTV|+2.4배|▲ 0.9배"
          }
        />
      </Field>
      <Field>
        <Label>Footer Claim (선택)</Label>
        <Input
          value={sl.stdFooter}
          onChange={(e) => upd({ stdFooter: e.target.value })}
          placeholder="예: 결과 — 블럭스 도입 고객의 [평균 LTV가 2.4배] 증가했습니다"
        />
      </Field>
    </div>
  );
}

function TwoColumnFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.twoH1}
          onChange={(e) => upd({ twoH1: e.target.value })}
          placeholder="예: [인앱 메시지]로 이탈 직전 고객을 잡다"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.twoSubhead}
          onChange={(e) => upd({ twoSubhead: e.target.value })}
          placeholder="예: 앱 내 행동 트리거 기반 실시간 메시지"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label>좌측 텍스트 (col 1–6)</Label>
          <Textarea
            rows={5}
            value={sl.twoLeft}
            onChange={(e) => upd({ twoLeft: e.target.value })}
            placeholder="예:\n트리거: 장바구니 이탈 30초 후\n채널: 인앱 팝업\n개인화: 담아둔 상품명+할인코드"
          />
        </Field>
        <Field>
          <Label>우측 비주얼 설명 (col 7–12)</Label>
          <Textarea
            rows={5}
            value={sl.twoRight}
            onChange={(e) => upd({ twoRight: e.target.value })}
            placeholder="예: 블럭스 대시보드 스크린샷 — 인앱 캠페인 설정 화면, 트리거 조건 + 미리보기 패널"
          />
        </Field>
      </div>
    </div>
  );
}

function ThreeUpFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  const setCard = (i: number, patch: Partial<CardItem>) =>
    upd({
      threeCards: sl.threeCards.map((c, j) =>
        j === i ? { ...c, ...patch } : c,
      ),
    });
  return (
    <div className="space-y-3">
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.threeH1}
          onChange={(e) => upd({ threeH1: e.target.value })}
          placeholder="예: 하나의 플랫폼으로 [전 채널]을 연결하다"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.threeSubhead}
          onChange={(e) => upd({ threeSubhead: e.target.value })}
          placeholder="예: 블럭스가 지원하는 3가지 핵심 채널"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        {sl.threeCards.slice(0, 3).map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2"
          >
            <span className="text-xs font-bold text-[#006ffd]">
              카드 {i + 1}
            </span>
            <Input
              value={c.title}
              onChange={(e) => setCard(i, { title: e.target.value })}
              placeholder="카드 제목"
            />
            <Textarea
              rows={3}
              value={c.body}
              onChange={(e) => setCard(i, { body: e.target.value })}
              placeholder="카드 본문 (최대 4줄)"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PainGridFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  const setItem = (i: number, patch: Partial<CardItem>) =>
    upd({
      painItems: sl.painItems.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  const addItem = () =>
    sl.painItems.length < 6 &&
    upd({ painItems: [...sl.painItems, { title: "", body: "" }] });
  const removeItem = (i: number) =>
    sl.painItems.length > 2 &&
    upd({ painItems: sl.painItems.filter((_, j) => j !== i) });

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
        <strong>[페인 키워드]</strong> — 강조할 pain 단어를 대괄호로 감싸세요.
        빨간색(text.pain)으로 처리됩니다.
      </div>
      <Field>
        <Label>H1</Label>
        <Input
          value={sl.painH1}
          onChange={(e) => upd({ painH1: e.target.value })}
          placeholder="예: 혹시 이런 고민, 해보신 적 있으신가요?"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.painSubhead}
          onChange={(e) => upd({ painSubhead: e.target.value })}
          placeholder="예: 대부분의 이커머스 마케터가 겪는 4가지 문제"
        />
      </Field>
      <div className="space-y-2">
        {sl.painItems.map((p, i) => (
          <div key={i} className="flex gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-xs font-bold text-red-400">
              {i + 1}
            </span>
            <Input
              value={p.title}
              onChange={(e) => setItem(i, { title: e.target.value })}
              placeholder={`페인 ${i + 1} 제목 — 예: [반복 업무]에 지쳐간다`}
              className="flex-1"
            />
            <Input
              value={p.body}
              onChange={(e) => setItem(i, { body: e.target.value })}
              placeholder="부연 설명 (선택)"
              className="flex-1"
            />
            <button
              onClick={() => removeItem(i)}
              className="mt-1 text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {sl.painItems.length < 6 && (
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          페인 추가
        </button>
      )}
    </div>
  );
}

function CompTableFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  const setCol = (i: number, val: string) =>
    upd({ compColumns: sl.compColumns.map((c, j) => (j === i ? val : c)) });
  const addCol = () =>
    sl.compColumns.length < 5 &&
    upd({
      compColumns: [...sl.compColumns, ""],
      compRows: sl.compRows.map((r) => ({ ...r, values: [...r.values, ""] })),
    });
  const setRow = (ri: number, patch: Partial<CompRow>) =>
    upd({
      compRows: sl.compRows.map((r, j) => (j === ri ? { ...r, ...patch } : r)),
    });
  const setVal = (ri: number, ci: number, val: string) =>
    upd({
      compRows: sl.compRows.map((r, j) =>
        j === ri
          ? { ...r, values: r.values.map((v, k) => (k === ci ? val : v)) }
          : r,
      ),
    });
  const addRow = () =>
    upd({
      compRows: [
        ...sl.compRows,
        { criteria: "", values: Array(sl.compColumns.length).fill("") },
      ],
    });
  const removeRow = (i: number) =>
    sl.compRows.length > 1 &&
    upd({ compRows: sl.compRows.filter((_, j) => j !== i) });

  return (
    <div className="space-y-3">
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.compH1}
          onChange={(e) => upd({ compH1: e.target.value })}
          placeholder="예: 왜 [블럭스]가 더 나은 선택인가"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.compSubhead}
          onChange={(e) => upd({ compSubhead: e.target.value })}
          placeholder="예: 5가지 핵심 기준으로 비교한 CRM 플랫폼"
        />
      </Field>
      <Field>
        <div className="flex items-center justify-between mb-1.5">
          <Label>컬럼 (첫 번째 = BLUX Featured 컬럼)</Label>
          {sl.compColumns.length < 5 && (
            <button
              onClick={addCol}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <Plus className="h-3 w-3" />
              추가
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {sl.compColumns.map((col, i) => (
            <Input
              key={i}
              value={col}
              onChange={(e) => setCol(i, e.target.value)}
              placeholder={i === 0 ? "BLUX" : `경쟁사 ${i}`}
              className="flex-1"
            />
          ))}
        </div>
      </Field>
      <Field>
        <div className="flex items-center justify-between mb-1.5">
          <Label>평가 행 (●●● 우수 / ●●○ 보통 / ●○○ 제한적)</Label>
          <button
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <Plus className="h-3 w-3" />행 추가
          </button>
        </div>
        <div className="space-y-2">
          {sl.compRows.map((row, ri) => (
            <div key={ri} className="flex gap-2 items-center">
              <Input
                value={row.criteria}
                onChange={(e) => setRow(ri, { criteria: e.target.value })}
                placeholder="평가 기준"
                className="w-32 shrink-0"
              />
              {sl.compColumns.map((_, ci) => (
                <Input
                  key={ci}
                  value={row.values[ci] ?? ""}
                  onChange={(e) => setVal(ri, ci, e.target.value)}
                  placeholder={ci === 0 ? "●●●" : "●●○"}
                  className="flex-1 text-center"
                />
              ))}
              <button
                onClick={() => removeRow(ri)}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Field>
    </div>
  );
}

function BeforeAfterFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  const setB = (i: number, val: string) =>
    upd({ baBeforeItems: sl.baBeforeItems.map((v, j) => (j === i ? val : v)) });
  const setA = (i: number, val: string) =>
    upd({ baAfterItems: sl.baAfterItems.map((v, j) => (j === i ? val : v)) });
  const addB = () =>
    sl.baBeforeItems.length < 5 &&
    upd({ baBeforeItems: [...sl.baBeforeItems, ""] });
  const addA = () =>
    sl.baAfterItems.length < 5 &&
    upd({ baAfterItems: [...sl.baAfterItems, ""] });
  const rmB = (i: number) =>
    sl.baBeforeItems.length > 1 &&
    upd({ baBeforeItems: sl.baBeforeItems.filter((_, j) => j !== i) });
  const rmA = (i: number) =>
    sl.baAfterItems.length > 1 &&
    upd({ baAfterItems: sl.baAfterItems.filter((_, j) => j !== i) });

  return (
    <div className="space-y-3">
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.baH1}
          onChange={(e) => upd({ baH1: e.target.value })}
          placeholder="예: 마케터의 하루가 [달라집니다]"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.baSubhead}
          onChange={(e) => upd({ baSubhead: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-500">
                기존 카드 (Before)
              </span>
              <span className="text-xs text-red-400 ml-1.5">
                — [pain] = 빨간색
              </span>
            </div>
            {sl.baBeforeItems.length < 5 && (
              <button
                onClick={addB}
                className="text-red-300 hover:text-red-500"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Input
            value={sl.baBeforeLabel}
            onChange={(e) => upd({ baBeforeLabel: e.target.value })}
            placeholder="기존 CRM"
            className="border-red-200"
          />
          {sl.baBeforeItems.map((v, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <Input
                value={v}
                onChange={(e) => setB(i, e.target.value)}
                placeholder={`항목 ${i + 1} — 예: [수작업 타겟팅]으로 1시간 소요`}
                className="flex-1 border-red-100"
              />
              <button
                onClick={() => rmB(i)}
                className="text-red-200 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#006ffd]">
                블럭스 카드 (After)
              </span>
              <span className="text-xs text-blue-400 ml-1.5">
                — [accent] = 파란색
              </span>
            </div>
            {sl.baAfterItems.length < 5 && (
              <button
                onClick={addA}
                className="text-blue-300 hover:text-[#006ffd]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Input
            value={sl.baAfterLabel}
            onChange={(e) => upd({ baAfterLabel: e.target.value })}
            placeholder="블럭스 이후"
            className="border-blue-200"
          />
          {sl.baAfterItems.map((v, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <Input
                value={v}
                onChange={(e) => setA(i, e.target.value)}
                placeholder={`항목 ${i + 1} — 예: [AI 자동 타겟팅]으로 3초 완료`}
                className="flex-1 border-blue-100"
              />
              <button
                onClick={() => rmA(i)}
                className="text-blue-200 hover:text-[#006ffd]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Field>
        <Label>Footer Claim (선택)</Label>
        <Input
          value={sl.baFooter}
          onChange={(e) => upd({ baFooter: e.target.value })}
          placeholder="예: 결과 — 마케터 1인이 블럭스로 [10배 더 많은] 고객에게 메시지를 보냅니다"
        />
      </Field>
    </div>
  );
}

function ConversationFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  const setCard = (i: number, patch: Partial<ConvCard>) =>
    upd({
      convCards: sl.convCards.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  const addCard = () =>
    sl.convCards.length < 4 &&
    upd({ convCards: [...sl.convCards, { context: "", user: "", agent: "" }] });
  const rmCard = (i: number) =>
    sl.convCards.length > 1 &&
    upd({ convCards: sl.convCards.filter((_, j) => j !== i) });

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-[#006ffd]/5 border border-[#006ffd]/20 px-3 py-2 text-xs text-[#006ffd]">
        <strong>[강조어]</strong> — Agent 응답에서 수치·결과 등 핵심 단어를
        대괄호로 감싸세요 → text.accent 파란색으로 처리
      </div>
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.convH1}
          onChange={(e) => upd({ convH1: e.target.value })}
          placeholder="예: 블럭스 AI Agent가 [대신 해드립니다]"
        />
      </Field>
      <Field>
        <Label>Subhead (선택)</Label>
        <Input
          value={sl.convSubhead}
          onChange={(e) => upd({ convSubhead: e.target.value })}
        />
      </Field>
      <div className="space-y-3">
        {sl.convCards.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                대화 카드 {i + 1}
              </span>
              <button
                onClick={() => rmCard(i)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={c.context}
              onChange={(e) => setCard(i, { context: e.target.value })}
              placeholder="고객 컨텍스트 태그 (예: 패션 커머스)"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-xs text-gray-400 mb-1">USER</span>
                <Textarea
                  rows={2}
                  value={c.user}
                  onChange={(e) => setCard(i, { user: e.target.value })}
                  placeholder="예: 이탈 고객에게 자동으로 메시지를 보내고 싶어요"
                />
              </div>
              <div>
                <span className="block text-xs text-[#006ffd] mb-1">
                  BLUX AGENT
                </span>
                <Textarea
                  rows={2}
                  value={c.agent}
                  onChange={(e) => setCard(i, { agent: e.target.value })}
                  placeholder="예: 지난 30일 이탈 고객 [1,240명]에게 개인화 메시지 자동 발송 설정 완료했어요."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {sl.convCards.length < 4 && (
        <button
          onClick={addCard}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          대화 카드 추가 (최대 4개)
        </button>
      )}
    </div>
  );
}

function EndFields({
  sl,
  upd,
}: {
  sl: Slide;
  upd: (p: Partial<Slide>) => void;
}) {
  const setLink = (i: number, val: string) =>
    upd({ endLinks: sl.endLinks.map((l, j) => (j === i ? val : l)) });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["cta", "thanks"] as const).map((v) => (
          <button
            key={v}
            onClick={() => upd({ endVariant: v })}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              sl.endVariant === v
                ? "border-[#152439] bg-[#152439] text-white"
                : "border-gray-200 bg-white hover:border-gray-300",
            )}
          >
            {v === "cta" ? "CTA (데모/링크 유도)" : "Thanks (감사 클로저)"}
          </button>
        ))}
      </div>
      <Field>
        <Label sub="[강조어] 대괄호 사용">H1</Label>
        <Input
          value={sl.endH1}
          onChange={(e) => upd({ endH1: e.target.value })}
          placeholder={
            sl.endVariant === "cta"
              ? "예: 지금, 블럭스와 함께 새로운 [CRM]을 시작하세요"
              : "예: 감사합니다."
          }
        />
      </Field>
      {sl.endVariant === "cta" && (
        <>
          <Field>
            <Label>CTA 링크 (최대 3개)</Label>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Input
                  key={i}
                  value={sl.endLinks[i] ?? ""}
                  onChange={(e) => setLink(i, e.target.value)}
                  placeholder={`링크 ${i + 1} — 예: 데모 체험 신청하기`}
                />
              ))}
            </div>
          </Field>
          <Field>
            <Label>연락처 스트립</Label>
            <Input
              value={sl.endContact}
              onChange={(e) => upd({ endContact: e.target.value })}
              placeholder="예: Blux 영업팀 · sales@blux.ai"
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ─── Single slide card ────────────────────────────────────────────────────────

function SlideCard({
  slide,
  index,
  total,
  deckSections,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  slide: Slide;
  index: number;
  total: number;
  deckSections: string[];
  onUpdate: (id: string, p: Partial<Slide>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const [open, setOpen] = useState(index < 4);
  const upd = (p: Partial<Slide>) => onUpdate(slide.id, p);
  const tmpl = TEMPLATES.find((t) => t.id === slide.template);

  const handleTemplateChange = (t: TemplateId) => {
    // Carry over chrome section name and reset template-specific fields
    onUpdate(slide.id, makeSlide(slide.id, t));
    onUpdate(slide.id, { sectionName: slide.sectionName });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        <span className="w-6 shrink-0 text-sm font-bold text-gray-300">
          {String(index + 1).padStart(2, "0")}
        </span>
        <TemplatePicker
          value={slide.template}
          onChange={handleTemplateChange}
        />
        {tmpl?.hasChrome && (
          <input
            type="text"
            value={slide.sectionName}
            onChange={(e) => upd({ sectionName: e.target.value })}
            placeholder="섹션명 (크롬 좌상단)"
            className="flex-1 min-w-0 h-8 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none focus:border-[#006ffd] focus:bg-white placeholder-gray-300 transition"
          />
        )}
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

      {/* Template fields */}
      {open && (
        <div className="px-5 py-4">
          {slide.template === "title" && <TitleFields sl={slide} upd={upd} />}
          {(slide.template === "agenda" ||
            slide.template === "section-divider") &&
            slide.template === "agenda" && (
              <AgendaFields sl={slide} upd={upd} deckSections={deckSections} />
            )}
          {slide.template === "section-divider" && (
            <DividerFields sl={slide} upd={upd} />
          )}
          {slide.template === "content-standard" && (
            <StandardFields sl={slide} upd={upd} />
          )}
          {slide.template === "two-column" && (
            <TwoColumnFields sl={slide} upd={upd} />
          )}
          {slide.template === "three-up-card" && (
            <ThreeUpFields sl={slide} upd={upd} />
          )}
          {slide.template === "pain-grid" && (
            <PainGridFields sl={slide} upd={upd} />
          )}
          {slide.template === "comparison-table" && (
            <CompTableFields sl={slide} upd={upd} />
          )}
          {slide.template === "before-after" && (
            <BeforeAfterFields sl={slide} upd={upd} />
          )}
          {slide.template === "conversation" && (
            <ConversationFields sl={slide} upd={upd} />
          )}
          {slide.template === "end" && <EndFields sl={slide} upd={upd} />}
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
      slides: prev.slides.map((sl) =>
        sl.id === id ? { ...sl, ...patch } : sl,
      ),
    }));

  const removeSlide = (id: string) =>
    setDeck((prev) => ({
      ...prev,
      slides: prev.slides.filter((sl) => sl.id !== id),
    }));

  const addSlide = () =>
    setDeck((prev) => ({
      ...prev,
      slides: [...prev.slides, makeSlide(nextId(), "content-standard")],
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

  const deckSections = deck.sections
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const brief = useMemo(() => buildBrief(deck), [deck]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => setDeck(INITIAL);

  const handleSlideCount = (n: number) => {
    setDeck((prev) => {
      const existing = prev.slides;
      if (n === existing.length) return prev;
      if (n > existing.length) {
        // Append missing slides with smart defaults
        const templates = defaultTemplatesForCount(n);
        const extra = Array.from({ length: n - existing.length }, (_, i) =>
          makeSlide(nextId(), templates[existing.length + i] ?? "content-standard"),
        );
        return { ...prev, slides: [...existing, ...extra] };
      }
      // Trim to n
      return { ...prev, slides: existing.slice(0, n) };
    });
  };

  return (
    <div className="flex gap-6 items-start">
      {/* ── 좌측 폼 ───────────────────────────────────────────── */}
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
              브리프 복사 → Claude에서{" "}
              <code className="bg-white/10 px-1.5 rounded text-white/80">
                /blux-slide-design
              </code>{" "}
              실행 → 브리프 붙여넣기 → 완성된 HTML 슬라이드 덱 생성
            </p>
          </div>
        </div>

        {/* ── 덱 설정 ───────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-bold text-[#152439] mb-5">덱 설정</h2>
          <div className="space-y-4">
            <Field>
              <Label>덱 제목</Label>
              <Input
                value={deck.title}
                onChange={(e) => updateDeck("title", e.target.value)}
                placeholder="예: Blux CRM 서비스 소개 / 이커머스 마케팅 자동화 전략"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>테마</Label>
                <div className="flex gap-2">
                  {(
                    [
                      ["dark", "Dark", "bg-[#0a192f]"],
                      ["light", "Light", "bg-[#f7f9fb] border border-gray-200"],
                    ] as const
                  ).map(([val, label, color]) => (
                    <button
                      key={val}
                      onClick={() => updateDeck("theme", val)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all flex-1",
                        deck.theme === val
                          ? "border-[#152439] bg-[#152439]/5 text-[#152439]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300",
                      )}
                    >
                      <span className={cn("w-4 h-4 rounded shrink-0", color)} />
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field>
                <Label>언어</Label>
                <div className="flex gap-2">
                  {(
                    [
                      ["한국어 중심", "KO"],
                      ["English main", "EN"],
                    ] as const
                  ).map(([val, short]) => (
                    <button
                      key={val}
                      onClick={() => updateDeck("language", val)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                        deck.language === val
                          ? "border-[#152439] bg-[#152439]/5 text-[#152439]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300",
                      )}
                    >
                      {short}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field>
              <Label sub="선택하면 슬라이드 목록 자동 구성">슬라이드 수</Label>
              <div className="flex flex-wrap gap-2">
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
                <span className="flex items-center text-xs text-gray-400 pl-1">
                  (현재 {deck.slides.length}장 — 개별 추가/삭제도 가능)
                </span>
              </div>
            </Field>

            <Field>
              <Label sub="줄마다 섹션 이름 1개 — Agenda 슬라이드에서 자동 참조">
                섹션 구성
              </Label>
              <Textarea
                id={`${uid}-sections`}
                rows={4}
                value={deck.sections}
                onChange={(e) => updateDeck("sections", e.target.value)}
                placeholder={"예:\n서비스 소개\n핵심 기능\n도입 효과\n시작하기"}
              />
            </Field>
          </div>
        </section>

        {/* ── 슬라이드 목록 ───────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#152439]">슬라이드 구성</h2>
          {deck.slides.map((sl, i) => (
            <SlideCard
              key={sl.id}
              slide={sl}
              index={i}
              total={deck.slides.length}
              deckSections={deckSections}
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

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="flex gap-2 pb-8">
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              "bg-[#0a192f] text-white shadow-sm hover:bg-[#152439] active:scale-[0.99]",
            )}
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
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </button>
        </div>
      </div>

      {/* ── 우측 브리프 프리뷰 ────────────────────────────────────── */}
      <div className="w-[420px] shrink-0 sticky top-[105px] self-start">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                생성된 브리프
              </p>
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
