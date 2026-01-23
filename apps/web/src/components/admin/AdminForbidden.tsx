type Props = {
  title?: string;
  description?: string;
};

export default function AdminForbidden({
  title = 'Доступ запрещён',
  description = 'У вас нет прав для доступа к этому разделу.',
}: Props) {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-10">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
