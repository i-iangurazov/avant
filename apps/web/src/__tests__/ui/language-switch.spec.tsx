// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import IntlProvider from '@/components/IntlProvider';
import LanguageSelect from '@/components/avantech/LanguageSelect';
import messages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';
import { LOCALE_COOKIE } from '@/lib/i18n';
import { useTranslations } from 'next-intl';

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const LabelProbe = () => {
  const t = useTranslations('common.language');
  return <div data-testid="label">{t('label')}</div>;
};

describe('language switch', () => {
  afterEach(() => {
    document.cookie = `${LOCALE_COOKIE}=; Max-Age=0; path=/`;
    refreshMock.mockClear();
  });

  it('updates locale cookie and translations immediately', async () => {
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    const { rerender } = render(
      <IntlProvider locale="en" messages={messages}>
        <LabelProbe />
        <LanguageSelect contentId="language-select-test" />
      </IntlProvider>
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('English');
    expect(screen.getByTestId('label')).toHaveTextContent('Language');

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Russian' }));

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Русский'));
    await waitFor(() => expect(screen.getByTestId('label')).toHaveTextContent('Язык'));
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=ru`);
    expect(refreshMock).toHaveBeenCalledTimes(1);

    rerender(
      <IntlProvider locale="ru" messages={ruMessages}>
        <LabelProbe />
        <LanguageSelect contentId="language-select-test-2" />
      </IntlProvider>
    );

    expect(screen.getByTestId('label')).toHaveTextContent('Язык');
  });
});
