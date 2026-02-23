'use client';

import { TableRow, TableCell } from '@/components/ui/Table';

interface SkeletonRowsProps {
  columns: number;
  rows?: number;
}

const WIDTHS = ['w-24', 'w-32', 'w-20', 'w-16', 'w-28'];

export default function SkeletonRows({ columns, rows = 5 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: columns }, (_, colIdx) => (
            <TableCell key={colIdx}>
              <div
                className={`h-4 bg-slate-700 rounded animate-pulse ${
                  WIDTHS[(rowIdx + colIdx) % WIDTHS.length]
                }`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
