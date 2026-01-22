// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import IntlProvider from '@/components/IntlProvider';
import { Sheet } from '@/components/ui/sheet';
import CartDrawer from '@/components/avantech/CartDrawer';
import FloatingCartBar from '@/components/avantech/FloatingCartBar';
import messages from '@/messages/en.json';

const CartHarness = () => {
  const [open, setOpen] = useState(false);
  const lines = [
    {
      variantId: 'variant-1',
      productName: 'Pipe',
      variantLabel: '1/2"',
      unitPrice: 120,
      quantity: 2,
    },
  ];

  return (
    <IntlProvider locale="en" messages={messages}>
      <Sheet open={open} onOpenChange={setOpen}>
        <CartDrawer
          lines={lines}
          totalPrice="240"
          formatPrice={(amount) => `${amount}`}
          onIncrement={() => {}}
          onDecrement={() => {}}
          onSetQuantity={() => {}}
          onRemove={() => {}}
          onOrder={() => {}}
          isOrdering={false}
        />
      </Sheet>
      <FloatingCartBar
        totalLabel="Total"
        totalPrice="240"
        itemCount={2}
        cartLabel="Cart"
        onOpenCart={() => setOpen(true)}
      />
    </IntlProvider>
  );
};

describe('cart UX', () => {
  it('opens the cart drawer from the cart button', async () => {
    render(<CartHarness />);

    await userEvent.click(screen.getByRole('button', { name: /cart/i }));

    const sheetContent = document.querySelector('[data-slot="sheet-content"]');
    expect(sheetContent).toHaveClass('w-screen');

    const footer = document.querySelector('[data-slot="sheet-footer"]');
    expect(footer).not.toBeNull();
    expect(within(footer as HTMLElement).getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });
});
