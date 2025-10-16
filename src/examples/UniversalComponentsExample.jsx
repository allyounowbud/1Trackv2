import React, { useState } from 'react';
import {
  UniversalCard,
  UniversalBulkMenu,
  UniversalOrderBook,
  UniversalSearchBar,
  UniversalGrid
} from '../components/ui';

/**
 * Example Implementation of Universal Components
 * 
 * This file demonstrates how to use the universal components
 * to replace the current page-specific implementations.
 * 
 * This example shows how the Collection page would look
 * using the new universal components.
 */
const UniversalComponentsExample = () => {
  // Force refresh to ensure changes are applied
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [selectedItemForOrderBook, setSelectedItemForOrderBook] = useState(null);

  // Mock data
  const mockItems = [
    {
      id: 1,
      name: 'Elite Trainer Box',
      set: 'Base Set',
      image: '/path/to/image.jpg',
      value: 150.00,
      totalPaid: 120.00,
      quantity: 3
    },
    {
      id: 2,
      name: 'Booster Pack',
      set: 'Base Set',
      image: '/path/to/image2.jpg',
      value: 5.00,
      totalPaid: 4.00,
      quantity: 10
    }
  ];

  const mockOrders = [
    {
      id: 1,
      order_number: 'ORD-001',
      purchase_date: '2024-01-15',
      retailer_name: 'Amazon',
      quantity: 3,
      quantity_sold: 1,
      price_per_item_cents: 4000 // $40.00
    }
  ];

  // Event handlers
  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
    // Handle item click (e.g., open details modal)
  };

  const handleLongPress = (itemId) => {
    setIsBulkSelectionMode(true);
    setSelectedItems(new Set([itemId]));
    setShowBulkMenu(true);
  };

  const handleSelectionToggle = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
    setShowBulkMenu(newSelection.size > 0);
  };

  const handleBulkMenuAction = (action) => {
    console.log(`${action} action triggered for ${selectedItems.size} items`);
    // Handle bulk actions
  };

  const handleOrderBookOpen = (item) => {
    setSelectedItemForOrderBook(item);
    setShowOrderBook(true);
  };

  const handleOrderBookClose = () => {
    setShowOrderBook(false);
    setSelectedItemForOrderBook(null);
  };

  const handleOrderEdit = (orderId, editData) => {
    console.log('Edit order:', orderId, editData);
    // Handle order edit
  };

  const handleOrderDelete = (orderId) => {
    console.log('Delete order:', orderId);
    // Handle order delete
  };

  const handleMarkAsSold = (orderId) => {
    console.log('Mark as sold:', orderId);
    // Handle mark as sold
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  const handleBulkMenuCancel = () => {
    setSelectedItems(new Set());
    setShowBulkMenu(false);
    setIsBulkSelectionMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header - Match Collection page structure */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Universal Components Example
        </h1>
        
        {/* Search Bar */}
        <UniversalSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search your items..."
          variant="collection"
          showResultsCount={true}
          resultsCount={mockItems.length}
          onClear={handleSearchClear}
        />
      </div>

      {/* Items Grid - Direct Collection page structure */}
      <div className={`px-4 md:px-6 lg:px-8 ${showBulkMenu ? 'pb-24' : 'pb-4'}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {mockItems.map((item) => (
            <UniversalCard
              key={item.id}
              item={item}
              variant="collection"
              isSelected={selectedItems.has(item.id)}
              showSelection={isBulkSelectionMode}
              onClick={() => handleItemClick(item)}
              onLongPress={() => handleLongPress(item.id)}
              onSelectionChange={() => handleSelectionToggle(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Bulk Menu */}
      <UniversalBulkMenu
        isVisible={showBulkMenu}
        selectedCount={selectedItems.size}
        variant="collection"
        onAddToCart={() => handleBulkMenuAction('addToCart')}
        onViewOrderBook={() => handleBulkMenuAction('viewOrderBook')}
        onOverridePrice={() => handleBulkMenuAction('overridePrice')}
        onDelete={() => handleBulkMenuAction('delete')}
        onCancel={handleBulkMenuCancel}
        showAddToCart={true}
        showOrderBook={true}
        showPriceOverride={true}
        showDelete={true}
        showExport={false}
      />

      {/* Order Book */}
      <UniversalOrderBook
        isVisible={showOrderBook}
        orders={mockOrders}
        item={selectedItemForOrderBook}
        variant="collection"
        onClose={handleOrderBookClose}
        onEdit={handleOrderEdit}
        onDelete={handleOrderDelete}
        onMarkAsSold={handleMarkAsSold}
        showEditActions={true}
        showDeleteActions={true}
        showMarkAsSoldActions={true}
      />
    </div>
  );
};

export default UniversalComponentsExample;
