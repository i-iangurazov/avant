import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AvantechApp from '@/components/avantech/AvantechApp';

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations('common.meta');

  return {
    title: tMeta('title'),
    description: tMeta('description'),
  };
}

export default function HomePage() {
  return <AvantechApp />;
}
