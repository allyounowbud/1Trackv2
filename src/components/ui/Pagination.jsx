import React, { useState } from 'react';

/**
 * Reusable Pagination Component
 * 
 * Features:
 * - Skip to start/end buttons
 * - Previous/next navigation
 * - Current page display with click-to-edit
 * - Border-only styling to match app theme
 * - Responsive and accessible
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPageInfo = true,
  pageSize = 30,
  totalItems = 0,
  className = "",
  hasBottomMenu = false,
  bottomMenuHeight = 0
}) => {
  const [pageInput, setPageInput] = useState(null);

  // Handle page navigation
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      onPageChange(newPage);
    }
  };

  // Handle page input submission
  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const newPage = parseInt(pageInput || currentPage);
    if (newPage >= 1 && newPage <= totalPages) {
      handlePageChange(newPage);
      setPageInput(null);
    }
  };

  // Handle current page button click to enable editing
  const handleCurrentPageClick = () => {
    setPageInput(currentPage);
  };

  // Don't render if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Calculate bottom padding based on menu state
  const bottomPadding = hasBottomMenu ? Math.max(96, bottomMenuHeight + 16) : 16;
  
  return (
    <div 
      className={`flex flex-col items-center gap-4 ${className}`}
      style={{ paddingBottom: `${bottomPadding}px` }}
    >
      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Skip to Start */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 bg-transparent border border-gray-700 rounded-lg disabled:opacity-50 hover:border-gray-600 transition-colors flex items-center justify-center disabled:cursor-not-allowed"
          title="First page"
          aria-label="Go to first page"
        >
          <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/>
          </svg>
        </button>

        {/* Previous Button */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 bg-transparent border border-gray-700 rounded-lg disabled:opacity-50 hover:border-gray-600 transition-colors flex items-center justify-center disabled:cursor-not-allowed"
          title="Previous page"
          aria-label="Go to previous page"
        >
          <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </button>

        {/* Current Page */}
        <div className="flex items-center gap-2 px-3">
          {pageInput !== null ? (
            <form onSubmit={handlePageInputSubmit} className="flex items-center">
              <input
                type="number"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => setPageInput(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setPageInput(null);
                }}
                min="1"
                max={totalPages}
                className="w-8 h-8 bg-transparent border border-gray-700 rounded-lg text-center text-white text-sm focus:outline-none focus:border-gray-600"
                autoFocus
                aria-label="Enter page number"
              />
            </form>
          ) : (
            <button
              onClick={handleCurrentPageClick}
              className="w-8 h-8 bg-transparent border border-gray-700 rounded-lg hover:border-gray-600 transition-colors flex items-center justify-center"
              title="Click to edit page number"
              aria-label={`Current page ${currentPage}, click to edit`}
            >
              <span className="text-white text-sm">{currentPage}</span>
            </button>
          )}
          <span className="text-gray-400 text-sm">of {totalPages}</span>
        </div>

        {/* Next Button */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 bg-transparent border border-gray-700 rounded-lg disabled:opacity-50 hover:border-gray-600 transition-colors flex items-center justify-center disabled:cursor-not-allowed"
          title="Next page"
          aria-label="Go to next page"
        >
          <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
        </button>

        {/* Skip to End */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 bg-transparent border border-gray-700 rounded-lg disabled:opacity-50 hover:border-gray-600 transition-colors flex items-center justify-center disabled:cursor-not-allowed"
          title="Last page"
          aria-label="Go to last page"
        >
          <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11.555 14.832A1 1 0 0010 14v-2.798L4.555 14.63A1 1 0 003 14V6a1 1 0 011.555-.832L10 8.798V6a1 1 0 011.555-.832l6 4a1 1 0 010 1.664l-6 4z"/>
          </svg>
        </button>
      </div>

      {/* Page Info */}
      {showPageInfo && totalItems > 0 && (
        <div className="text-center text-sm text-gray-400">
          Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
        </div>
      )}
    </div>
  );
};

export default Pagination;
