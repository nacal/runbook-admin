interface SearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  placeholder?: string
}

export function SearchBar({
  searchTerm,
  onSearchChange,
  placeholder = '🔍 Search runbooks...',
}: SearchBarProps) {
  return (
    <div class="mb-6">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
        class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </div>
  )
}
