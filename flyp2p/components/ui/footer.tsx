export function Footer() {
  return (
    <footer>
      <div className="mx-auto flex w-full flex-col gap-4 px-6 py-8 text-sm text-[#3f4a59] sm:px-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#0c1018]">FlyP2P</span>
          <span className="text-xs uppercase tracking-[0.25em] text-[#6b7482]">
            Flight cover
          </span>
        </div>

        <div className="text-xs text-[#6b7482]">
          © {new Date().getFullYear()} FlyP2P. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
