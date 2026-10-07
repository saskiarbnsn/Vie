/** Íconos de trazo (24×24) para la app. Heredan el color del texto. */

type Props = { className?: string; size?: number };

function Icono({ d, className, size = 22 }: Props & { d: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {d}
    </svg>
  );
}

export const IconoInicio = (p: Props) => <Icono {...p} d={<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />} />;
export const IconoEntreno = (p: Props) => <Icono {...p} d={<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12" />} />;
export const IconoCuerpo = (p: Props) => (
  <Icono {...p} d={<><circle cx="12" cy="6" r="3" /><path d="M6 21v-4a6 6 0 0 1 12 0v4" /></>} />
);
export const IconoCiclo = (p: Props) => (
  <Icono {...p} d={<><path d="M21 12a9 9 0 1 1-9-9" /><circle cx="18" cy="6" r="2" /></>} />
);
export const IconoComidas = (p: Props) => (
  <Icono {...p} d={<><path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3" /><path d="M18 21V3c-2.5 1.5-4 4.5-4 8h4" /></>} />
);
export const IconoVolver = (p: Props) => <Icono {...p} d={<path d="M15 18l-6-6 6-6" />} />;
export const IconoMas = (p: Props) => <Icono {...p} d={<path d="M12 5v14M5 12h14" />} />;
export const IconoCerrar = (p: Props) => <Icono {...p} d={<path d="M6 6l12 12M18 6L6 18" />} />;
export const IconoCheck = (p: Props) => <Icono {...p} d={<path d="M5 12l5 5L20 7" />} />;
export const IconoLapiz = (p: Props) => <Icono {...p} d={<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>} />;
export const IconoChevron = (p: Props) => <Icono {...p} d={<path d="M9 18l6-6-6-6" />} />;
export const IconoInfo = (p: Props) => (
  <Icono {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>} />
);
export const IconoChispa = (p: Props) => (
  <Icono
    {...p}
    d={<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" />}
  />
);
export const IconoGota = (p: Props) => <Icono {...p} d={<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" />} />;
export const IconoSync = (p: Props) => (
  <Icono
    {...p}
    d={<><path d="M21 12a9 9 0 0 0-15.7-6L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 15.7 6L21 16" /><path d="M16 16h5v5" /></>}
  />
);
export const IconoAmanecer = (p: Props) => (
  <Icono
    {...p}
    d={<><path d="M12 2v6" /><path d="m8 6 4-4 4 4" /><path d="M2 18h2M20 18h2M4.9 10.9l1.4 1.4M19.1 10.9l-1.4 1.4" /><path d="M22 22H2" /><path d="M16 18a4 4 0 0 0-8 0" /></>}
  />
);
export const IconoLlama = (p: Props) => (
  <Icono
    {...p}
    d={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />}
  />
);
