import { useState, useEffect, useCallback } from 'react';
import { TRANSACTION_GROUPS, TRANSACTION_GROUP_MAPPING, TransactionType, TransactionGroup } from '@/types/transactions.types';

export function useTransactionNavigation() {
  const [selectedGroup, setSelectedGroup] = useState<TransactionGroup>(TRANSACTION_GROUPS.MONEY_IN);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);

  // Get current group's transaction types
  const currentGroupTypes = TRANSACTION_GROUP_MAPPING[selectedGroup];
  
  // Get all groups in order
  const allGroups = Object.keys(TRANSACTION_GROUP_MAPPING) as TransactionGroup[];
  const currentGroupIndex = allGroups.indexOf(selectedGroup);

  // Navigate within current group (no Shift)
  const navigateWithinGroup = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const currentIndex = focusedCardIndex;
    let newIndex = currentIndex;

    switch (direction) {
      case 'up':
        newIndex = currentIndex - 1;
        break;
      case 'down':
        newIndex = currentIndex + 1;
        break;
      case 'left':
        newIndex = currentIndex - 1;
        break;
      case 'right':
        newIndex = currentIndex + 1;
        break;
    }

    // Wrap around within current group
    const wrappedIndex = (newIndex + currentGroupTypes.length) % currentGroupTypes.length;
    setFocusedCardIndex(wrappedIndex);
  }, [focusedCardIndex, currentGroupTypes.length]);

  // Navigate between groups (Shift + arrow)
  const navigateBetweenGroups = useCallback((direction: 'left' | 'right') => {
    let newGroupIndex = currentGroupIndex;

    switch (direction) {
      case 'left':
        newGroupIndex = currentGroupIndex - 1;
        break;
      case 'right':
        newGroupIndex = currentGroupIndex + 1;
        break;
    }

    // Wrap around between all groups
    const wrappedGroupIndex = (newGroupIndex + allGroups.length) % allGroups.length;
    const newGroup = allGroups[wrappedGroupIndex];
    
    setSelectedGroup(newGroup);
    setFocusedCardIndex(0); // Reset to first card in new group
  }, [currentGroupIndex, allGroups.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    if (e.shiftKey) {
      // Shift + arrows = navigate between groups
      e.preventDefault();
      if (e.key === 'ArrowLeft') {
        navigateBetweenGroups('left');
      } else if (e.key === 'ArrowRight') {
        navigateBetweenGroups('right');
      }
    } else {
      // Regular arrows = navigate within group
      e.preventDefault();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        navigateWithinGroup('up');
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        navigateWithinGroup('down');
      }
    }
  }, [navigateWithinGroup, navigateBetweenGroups]);

  // Select focused transaction
  const selectFocusedTransaction = useCallback(() => {
    const selectedType = currentGroupTypes[focusedCardIndex];
    return selectedType;
  }, [currentGroupTypes, focusedCardIndex]);

  return {
    selectedGroup,
    setSelectedGroup,
    focusedCardIndex,
    setFocusedCardIndex,
    currentGroupTypes,
    handleKeyDown,
    selectFocusedTransaction,
    navigateWithinGroup,
    navigateBetweenGroups,
  };
}
