import { BarraInferior } from "@/components/barra-inferior";

export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex-1 pb-28">{children}</div>
      <BarraInferior />
    </>
  );
}
