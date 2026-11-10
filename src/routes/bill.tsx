import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Check, Info, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Sheet } from "@/components/eco/Sheet";
import { Footnote, IconCircle, InkButton, Pill, Screen, ScreenHeader, SunPanel, TopArea, WhiteButton } from "@/components/eco/ui";
import { useEco, type BillData } from "@/lib/eco-store";
import { fa, faDigits } from "@/lib/fa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bill")({
  head: () => ({
    meta: [
      { title: "تأیید اطلاعات قبض | اکوسولار" },
      { name: "description", content: "بررسی و تأیید داده‌های استخراج‌شده از قبض برق برای تحلیل مصرف." },
      { property: "og:title", content: "تأیید اطلاعات قبض | اکوسولار" },
      { property: "og:description", content: "بررسی و تأیید داده‌های استخراج‌شده از قبض برق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillScreen,
});

type FieldKey = keyof BillData;

const FIELDS: { key: FieldKey; label: string; unit?: string; numeric: boolean; lowConfidence?: boolean }[] = [
  { key: "id", label: "شناسه قبض", numeric: false },
  { key: "period", label: "دوره صورتحساب", numeric: false },
  { key: "peak", label: "مصرف اوج", unit: "kWh", numeric: true },
  { key: "mid", label: "مصرف میان‌باری", unit: "kWh", numeric: true },
  { key: "low", label: "مصرف کم‌باری", unit: "kWh", numeric: true, lowConfidence: true },
  { key: "total", label: "مبلغ کل قبض", unit: "ریال", numeric: true },
];

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

function display(key: FieldKey, v: string | number) {
  if (key === "id") return faDigits(v);
  if (typeof v === "number") return key === "total" ? fa(v, 0, false) : fa(v, 0, false);
  return v;
}

function BillScreen() {
  const { state, update } = useEco();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BillData>(state.bill);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [manual, setManual] = useState(false);
  const [lowReviewed, setLowReviewed] = useState(state.lowConfidenceReviewed);
  const [confidence, setConfidence] = useState(92);
  const [scanning, setScanning] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.bill);

  function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setConfidence(95);
      toast.success("قبض دوباره خوانده شد", { description: "اطمینان استخراج ۹۵٪" });
    }, 1600);
  }

  function setField(key: FieldKey, raw: string, numeric: boolean) {
    if (key === "low") setLowReviewed(true);
    setDraft((d) => ({
      ...d,
      [key]: numeric ? Number(toLatin(raw).replace(/\D/g, "") || 0) : key === "id" ? toLatin(raw).replace(/\D/g, "") : raw,
    }));
  }

  function save() {
    update((s) => ({
      bill: draft,
      billRevision: dirty ? s.billRevision + 1 : s.billRevision,
      lowConfidenceReviewed: true,
    }));
    toast.success(dirty ? `تغییرات با شماره بازبینی ${faDigits(state.billRevision + 1)} ذخیره شد` : "اطلاعات قبض تأیید شد");
    navigate({ to: "/optimize" });
  }

  function confirmAndContinue() {
    if (!lowReviewed) {
      setConfirmOpen(true);
      return;
    }
    save();
  }

  return (
    <Screen>
      <TopArea>
        <ScreenHeader
          title="تأیید اطلاعات قبض"
          backTo="/dashboard"
          end={
            <IconCircle aria-label="راهنما" onClick={() => setInfoOpen(true)}>
              <Info className="size-5" />
            </IconCircle>
          }
        />

        <p className="mt-6 text-xs text-muted-foreground">مرحله ۲ از ۳ | قبض برق</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full", i < 2 ? "bg-ink" : "bg-track")} />
          ))}
        </div>

        <div className="relative mt-5 h-48 overflow-hidden rounded-[1.75rem] bg-card shadow-soft">
          <div className="absolute left-1/2 top-1/2 h-36 w-40 -translate-x-1/2 -translate-y-1/2">
            {photo ? (
              <img src={photo} alt="عکس قبض" className="size-full rounded-lg object-cover" />
            ) : (
              <div className="size-full space-y-2.5 rounded-lg bg-background p-4">
                {[85, 100, 60, 90, 55, 80, 70].map((w, i) => (
                  <div key={i} className="ms-auto h-2 rounded-full bg-track" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
            {[
              "right-0 top-0 border-r-2 border-t-2",
              "left-0 top-0 border-l-2 border-t-2",
              "right-0 bottom-0 border-r-2 border-b-2",
              "left-0 bottom-0 border-l-2 border-b-2",
            ].map((c) => (
              <span key={c} className={cn("absolute size-8 border-sun-deep", c)} />
            ))}
            <span className={cn("absolute -inset-x-5 top-1/2 h-0.5 bg-sun-deep", scanning && "animate-scan")} />
          </div>
          <Pill tone="success" size="sm" className="absolute right-4 top-4 h-7 px-3 text-xs">
            <span className="size-1.5 rounded-full bg-success" />
            {scanning ? "در حال خواندن..." : `اطمینان استخراج ${fa(confidence)}٪`}
          </Pill>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-4 left-4 flex h-9 items-center gap-1.5 rounded-full bg-background px-3 text-xs font-extrabold"
          >
            <Camera className="size-4" /> عکس مجدد
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </div>
      </TopArea>

      <SunPanel>
        <h2 className="text-xl font-extrabold">داده‌های استخراج‌شده</h2>
        <p className="mt-1 text-xs text-foreground/75">هر مقدار را بررسی کنید؛ مبنای تحلیل همین داده‌هاست</p>

        <div className="mt-4 rounded-[1.75rem] bg-card px-3 py-1">
          {FIELDS.map((f, idx) => {
            const isEditing = manual || editing === f.key;
            const isLow = f.lowConfidence && !lowReviewed;
            const value = draft[f.key];
            return (
              <div
                key={f.key}
                className={cn(
                  "flex items-center gap-3 px-2 py-3",
                  idx < FIELDS.length - 1 && !isLow && "border-b border-border",
                  isLow && "my-1 rounded-2xl bg-warn-soft",
                )}
              >
                <span className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                  {f.label}
                  {isLow ? (
                    <Pill tone="white" size="sm" className="text-warn">اطمینان پایین</Pill>
                  ) : null}
                </span>
                {isEditing ? (
                  <input
                    autoFocus={editing === f.key}
                    aria-label={f.label}
                    inputMode={f.numeric || f.key === "id" ? "numeric" : "text"}
                    value={typeof value === "number" ? faDigits(value) : f.key === "id" ? faDigits(value) : value}
                    onChange={(e) => setField(f.key, e.target.value, f.numeric)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                    className="w-36 rounded-xl bg-background px-3 py-1.5 text-left text-sm font-extrabold outline-none focus:ring-2 focus:ring-sun-deep"
                    dir={f.numeric || f.key === "id" ? "ltr" : "rtl"}
                  />
                ) : (
                  <span className="num text-sm font-extrabold" dir={f.unit === "kWh" ? "ltr" : "rtl"}>
                    {f.unit === "kWh" ? `${display(f.key, value)} kWh` : f.unit ? `${display(f.key, value)} ${f.unit}` : display(f.key, value)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={editing === f.key ? `تأیید ${f.label}` : `ویرایش ${f.label}`}
                  onClick={() => {
                    if (f.key === "low") setLowReviewed(true);
                    setEditing(editing === f.key ? null : f.key);
                  }}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    isLow ? "bg-warn text-ink-foreground" : "bg-background",
                  )}
                >
                  {editing === f.key ? <Check className="size-4" /> : <Pencil className="size-3.5" fill="currentColor" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3">
          <InkButton onClick={confirmAndContinue}>تأیید و ادامه</InkButton>
          <WhiteButton
            onClick={() => {
              setManual((m) => !m);
              setLowReviewed(true);
            }}
            className={cn(manual && "ring-2 ring-ink")}
          >
            {manual ? "پایان اصلاح" : "اصلاح دستی"}
          </WhiteButton>
        </div>
        <Footnote>
          هر اصلاح با شماره بازبینی ذخیره می‌شود و نسخه قبلی حفظ می‌ماند
          {state.billRevision > 1 ? ` (بازبینی فعلی: ${faDigits(state.billRevision)})` : ""}
        </Footnote>
      </SunPanel>

      <Sheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="مصرف کم‌باری را بررسی کنید"
        description="اطمینان استخراج این مقدار پایین است. آیا عدد ۲۹۷ کیلووات‌ساعت با قبض شما مطابقت دارد؟"
      >
        <div className="flex gap-3">
          <InkButton
            onClick={() => {
              setLowReviewed(true);
              setConfirmOpen(false);
              save();
            }}
          >
            بله، درست است
          </InkButton>
          <WhiteButton
            className="bg-sun"
            onClick={() => {
              setConfirmOpen(false);
              setLowReviewed(true);
              setEditing("low");
            }}
          >
            اصلاح مقدار
          </WhiteButton>
        </div>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen} title="راهنمای تأیید قبض">
        <ul className="space-y-3 text-sm leading-7 text-foreground/85">
          <li>• اطلاعات با هوش مصنوعی از عکس قبض استخراج شده است.</li>
          <li>• ردیف نارنجی یعنی اطمینان استخراج پایین است؛ لطفاً آن را با قبض مقایسه کنید.</li>
          <li>• برای اصلاح هر مقدار روی آیکن مداد بزنید یا «اصلاح دستی» را انتخاب کنید.</li>
          <li>• اگر عکس واضح نیست، «عکس مجدد» را بزنید.</li>
        </ul>
      </Sheet>
    </Screen>
  );
}
