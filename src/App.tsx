import { useState } from "react";
import { TagGroup } from "@/components/TagGroup";
import { SlidePrompter } from "@/components/SlidePrompter";
import { cn } from "@/lib/utils";
import { Copy, RotateCcw, Sparkles, Check } from "lucide-react";

const CONFIG = {
  채널: ["LinkedIn", "인스타그램", "스레드", "유튜브", "블로그", "뉴스레터"],
  포맷: ["카드뉴스", "텍스트 포스팅", "숏폼 스크립트", "인포그래픽", "썸네일 카피"],
  톤: ["존댓말", "반말", "격식체"],
  "타겟 독자": ["CRM 실무자", "마케팅 팀장", "대표·의사결정자", "개발자"],
  "메시지 방향": [
    "문제 공감",
    "블럭스 소개",
    "기능 설명",
    "비용·ROI",
    "바이럴·재미",
    "Thought Leadership",
  ],
  시리즈: [
    "단발성",
    "카톡 얼마짜리",
    "마케터 없는 7일",
    "AI CRM 체점",
    "견적서 해부학",
    "퇴사 노트북",
    "푸시 까보기",
  ],
} as const;

type Category = keyof typeof CONFIG;
type Selections = Record<Category, string[]>;

const INITIAL: Selections = {
  채널: [],
  포맷: [],
  톤: [],
  "타겟 독자": [],
  "메시지 방향": [],
  시리즈: [],
};

function buildPrompt(selections: Selections, topic: string): string {
  const lines: string[] = [];
  lines.push("아래 조건에 맞는 콘텐츠를 작성해줘.\n");
  const entries: [Category, string][] = [
    ["채널", "채널"],
    ["포맷", "포맷"],
    ["톤", "톤"],
    ["타겟 독자", "타겟 독자"],
    ["메시지 방향", "메시지 방향"],
    ["시리즈", "시리즈"],
  ];
  for (const [key, label] of entries) {
    const vals = selections[key];
    if (vals.length > 0) {
      lines.push(`**${label}**: ${vals.join(", ")}`);
    }
  }
  if (topic.trim()) {
    lines.push(`\n**주제 / 소재**:\n${topic.trim()}`);
  }
  lines.push(
    "\n---\n위 조건을 반영해서 실제로 바로 쓸 수 있는 콘텐츠를 작성해줘. 불필요한 설명 없이 결과물만 줘."
  );
  return lines.join("\n");
}

function ContentPrompter() {
  const [selections, setSelections] = useState<Selections>(INITIAL);
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const handleChange = (category: Category) => (vals: string[]) => {
    setSelections((prev) => ({ ...prev, [category]: vals }));
  };

  const handleGenerate = () => setPrompt(buildPrompt(selections, topic));

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelections(INITIAL);
    setTopic("");
    setPrompt("");
  };

  const isEmpty =
    Object.values(selections).every((v) => v.length === 0) && !topic;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.entries(CONFIG) as [Category, readonly string[]][]).map(
          ([category, options]) => (
            <div
              key={category}
              className={cn(
                "rounded-xl border border-gray-200 bg-white p-4",
                (category === "메시지 방향" || category === "시리즈") &&
                  "sm:col-span-2"
              )}
            >
              <TagGroup
                label={category}
                options={options as string[]}
                selected={selections[category]}
                multi={category !== "톤"}
                onChange={handleChange(category)}
              />
            </div>
          )
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-sm font-medium text-gray-500">
          주제 / 소재{" "}
          <span className="font-normal text-gray-300">(자유입력)</span>
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={`예: 이번에 카카오 브랜드메시지 기능 추가됐어. 이걸로 카드뉴스 만들고 싶어.\n또는: 올리브영 CRM 메시지 뜯어보기 1편`}
          rows={3}
          className="mt-2.5 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#006ffd] focus:bg-white focus:ring-2 focus:ring-[#006ffd]/10"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={isEmpty}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
            isEmpty
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-[#152439] text-white shadow-sm hover:bg-[#1e3353] active:scale-[0.99]"
          )}
        >
          <Sparkles className="h-4 w-4" />
          프롬프트 생성
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </button>
      </div>

      {prompt ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              생성된 프롬프트
            </span>
            <button
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
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
          <pre className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-relaxed text-gray-700 font-sans">
            {prompt}
          </pre>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
          <p className="text-sm text-gray-400">
            옵션을 선택한 뒤 "프롬프트 생성"을 누르면 여기에 나타나요.
          </p>
        </div>
      )}
    </div>
  );
}

type Tab = "content" | "slide";

export default function App() {
  const [tab, setTab] = useState<Tab>("content");

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#152439]">blux.</span>
            <span className="text-sm text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-600">
              프롬프트 생성기
            </span>
          </div>
          <a
            href="https://blux.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            blux.ai →
          </a>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-3xl px-6 flex gap-0 border-t border-gray-100">
          {(
            [
              { id: "content" as Tab, label: "콘텐츠 프롬프터" },
              { id: "slide" as Tab, label: "슬라이드 프롬프터" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
                tab === id
                  ? "border-[#152439] text-[#152439]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        {tab === "content" ? <ContentPrompter /> : <SlidePrompter />}
      </main>
    </div>
  );
}
