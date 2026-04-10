'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TRANSACTION_TYPE_SHORTCUTS, GLOBAL_SHORTCUTS, FORM_NAVIGATION_SHORTCUTS } from '@/constants/keyboard-shortcuts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Transaction Type Selection</h3>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">Card Navigation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ArrowDown className="h-4 w-4" />
                      <span>Next Card</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ArrowUp className="h-4 w-4" />
                      <span>Previous Card</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">Shift</Badge>
                        <span>+</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <span>Next Section</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">Shift</Badge>
                        <span>+</span>
                        <ArrowLeft className="h-4 w-4" />
                      </div>
                      <span>Previous Section</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Enter</Badge>
                      <span>Select Focused Card</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">Sequential Selection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <div key={num} className="flex items-center justify-between p-3 border rounded-lg">
                      <span>Item #{num} in active group</span>
                      <Badge variant="secondary">{num}</Badge>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>...up to 9</span>
                    <Badge variant="secondary">9</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3">Global Shortcuts</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">N</Badge>
                  <span>New Transaction</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">?</Badge>
                  <span>Show/Hide Help</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Esc</Badge>
                  <span>Reset Form / Close Dialog</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Backspace</Badge>
                  <span>Back to Transaction Types</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">Ctrl</Badge>
                    <span>+</span>
                    <Badge variant="outline">Enter</Badge>
                  </div>
                  <span>Submit Form</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3">Form Navigation</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="h-4 w-4" />
                    <ArrowDown className="h-4 w-4" />
                  </div>
                  <span>Navigate Dropdown Options</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="h-4 w-4" />
                    <ArrowDown className="h-4 w-4" />
                  </div>
                  <span>Increment/Decrement Amount</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Enter</Badge>
                  <span>Select Option / Submit Form</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">→</Badge>
                  <span>Next Field</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">←</Badge>
                  <span>Previous Field</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3">Dropdown Navigation</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span>Type text</span>
                  <span>Filter Options</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowDown className="h-4 w-4" />
                  <span>Open Dropdown / Next Option</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowUp className="h-4 w-4" />
                  <span>Previous Option</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Enter</Badge>
                  <span>Select Highlighted Option</span>
                </div>
              </div>
                          </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Pro Tips</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Press number keys (1-9) to select items sequentially in the current section</li>
              <li>Press Shift + Left/Right to switch between Money In, Money Out, and Transfers</li>
              <li>Start typing in dropdowns to filter options instantly</li>
              <li>Use Arrow keys or Enter to move between fields rapidly</li>
              <li>Press Ctrl+Enter or select and press Enter in the last field to submit</li>
              <li>Press Escape to cancel and return to transaction type selection</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
