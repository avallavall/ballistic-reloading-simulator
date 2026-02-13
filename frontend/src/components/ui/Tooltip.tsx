interface TooltipProps {
  text: string;
}

export default function Tooltip({ text }: TooltipProps) {
  return (
    <span className="group relative ml-1 inline-flex cursor-help">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold leading-none text-slate-300 transition-colors group-hover:bg-blue-500 group-hover:text-white">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-md bg-slate-700 px-3 py-2 text-xs leading-relaxed text-slate-200 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
      </span>
    </span>
  );
}
