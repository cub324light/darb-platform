"use client";
/* ═══════════ ما تلبسه — لقبُك وشارتُك ═══════════
   الزينةُ التي لا يراها أحدٌ لا تُشترى. فما اشتراه الطالبُ ولبسه يظهر جنب اسمه
   في الرئيسية. ولا شيءَ يظهر لمن لم يلبس — لا مكانٌ فارغٌ ولا وعدٌ معلّق. */
import Link from "next/link";
import { useOwned } from "@/lib/economy/store";
import { equippedItem } from "@/lib/economy/wallet";
import { CATALOG } from "@/lib/economy/catalog";

export default function WornCosmetics() {
  const owned = useOwned();
  const title = equippedItem(CATALOG, owned, "title");
  const badge = equippedItem(CATALOG, owned, "badge");
  if (!title && !badge) return null;

  return (
    <Link href="/store" className="inline-flex items-center gap-1.5 no-underline" aria-label="زينتك — افتح المتجر">
      {badge && (
        <span className="t-caption font-black px-2 py-0.5 rounded-full"
          style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
          {badge.label}
        </span>
      )}
      {title && (
        <span className="t-caption font-black px-2.5 py-0.5 rounded-full"
          style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>
          {title.label}
        </span>
      )}
    </Link>
  );
}
