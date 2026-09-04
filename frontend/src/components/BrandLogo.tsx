export function BrandLogo({
  size = 56,
  className = "",
  light = false,
}: {
  size?: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <img
      src="/ZiyoHotel-logo.png"
      alt="ZiyoHotel"
      width={size}
      height={size}
      className={`bg-transparent object-contain ${light ? "drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)]" : ""} ${className}`}
    />
  );
}
