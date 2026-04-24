import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (field: string, order: 'asc' | 'desc') => void;
  className?: string;
}

export default function SortableHeader({
  label, field, currentSort, currentOrder, onSort, className = '',
}: SortableHeaderProps) {
  const isActive = currentSort === field;

  const handleClick = () => {
    if (isActive) {
      onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4 text-primary-600" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-primary-600" />
          )
        ) : (
          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </th>
  );
}
