"use client";
/* يطبّق حجمَ الخطّ المحفوظ على الجذر بعد الترطيب — لا في الرسم الأوّل، فالخادمُ
   لا يعرف تفضيلَ الجهاز والاختلافُ يكسر الترطيب. مركَّبٌ في القبّة الحاضرة بكل صفحة. */
import { useEffect } from "react";
import { useFontScale, SCALE_PX } from "@/lib/fontScale";

export default function FontScaleApply() {
  const scale = useFontScale();
  useEffect(() => {
    document.documentElement.style.fontSize = `${SCALE_PX[scale]}px`;
  }, [scale]);
  return null;
}
