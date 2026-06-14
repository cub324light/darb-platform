/* شعار "درب" — دائماً أزرق بغض النظر عن المظهر */
export default function Logo({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{
        color: "var(--accent-light)",
        textShadow: "0 0 22px color-mix(in srgb, var(--accent-light) 40%, transparent)",
        ...style,
      }}
    >
      درب
    </span>
  );
}
