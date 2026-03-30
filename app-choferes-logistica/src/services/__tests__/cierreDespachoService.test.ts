import { describe, it, expect, vi, beforeEach } from "vitest";
import { cerrarDespachoYEnviarComprobante } from "../cierreDespachoService";

/**
 * Mocks compartidos (hoisted) para interceptar Supabase y Resend sin red ni BD reales.
 */
const mocks = vi.hoisted(() => {
  const maybeSingleRutas = vi.fn();
  const selectEntregas = vi.fn();

  const fromMock = vi.fn((table: string) => {
    if (table === "rutas") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleRutas,
          })),
        })),
      };
    }
    if (table === "entregas") {
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: selectEntregas,
          })),
        })),
      };
    }
    return {};
  });

  const resendSendMock = vi.fn();

  return { maybeSingleRutas, selectEntregas, fromMock, resendSendMock };
});

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

vi.mock("resend", () => ({
  Resend: class ResendMock {
    emails = {
      send: mocks.resendSendMock,
    };
  },
}));

/** Payload coherente con lo que espera `generarComprobantePDF` (sin URLs de imágenes para evitar fetch). */
const mockRutaValida = {
  id: "ruta-test-1",
  origen: "Bodega Central",
  destino: "Cliente Final",
  cliente_id: "cli-1",
  clientes: {
    id: "cli-1",
    nombre: "Cliente Prueba",
    contacto_email: "cliente@test.com",
  },
  entregas: [
    { id: "ent-1", firma_url: null as string | null, validado: false as boolean | null },
  ],
  fotos: [] as { id: string; etapa: string; url: string | null }[],
};

/**
 * El cliente JS de Supabase expone builders “thenable”; Vitest necesita algo await-able tras `.select()`.
 */
function asThenable<T>(value: T) {
  return {
    then(
      onFulfilled: (v: T) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
  };
}

describe("cierreDespachoYEnviarComprobante", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingleRutas.mockReset();
    mocks.selectEntregas.mockReset();
    mocks.resendSendMock.mockReset();
  });

  it("Happy path: datos de ruta OK, PDF generado, Resend OK y entrega marcada validada", async () => {
    mocks.maybeSingleRutas.mockResolvedValue({
      data: mockRutaValida,
      error: null,
    });

    mocks.selectEntregas.mockImplementation(() =>
      asThenable({ data: [{ id: "ent-1" }], error: null })
    );

    mocks.resendSendMock.mockResolvedValue({
      data: { id: "email-mock-id" },
      error: null,
    });

    const resultado = await cerrarDespachoYEnviarComprobante("ruta-test-1");

    expect(resultado).toEqual({
      emailEnviadoA: "cliente@test.com",
      rutaId: "ruta-test-1",
      nombreCliente: "Cliente Prueba",
    });

    expect(mocks.fromMock).toHaveBeenCalledWith("rutas");
    expect(mocks.fromMock).toHaveBeenCalledWith("entregas");
    expect(mocks.resendSendMock).toHaveBeenCalledTimes(1);

    const sendPayload = mocks.resendSendMock.mock.calls[0]![0] as {
      to: string;
      attachments?: { filename: string; content: string }[];
    };
    expect(sendPayload.to).toBe("cliente@test.com");
    expect(sendPayload.attachments?.[0]?.filename).toBe("comprobante-despacho.pdf");
    expect(typeof sendPayload.attachments?.[0]?.content).toBe("string");
    expect(sendPayload.attachments?.[0]?.content!.length).toBeGreaterThan(0);
  });

  it("Error BD: fallo al leer ruta — no se llama a Resend ni se actualiza entrega", async () => {
    mocks.maybeSingleRutas.mockResolvedValue({
      data: null,
      error: { message: "Error simulado de Supabase al leer rutas" },
    });

    await expect(
      cerrarDespachoYEnviarComprobante("ruta-inexistente")
    ).rejects.toThrow(/Error al obtener datos de la ruta/);

    expect(mocks.resendSendMock).not.toHaveBeenCalled();
    expect(mocks.fromMock).not.toHaveBeenCalledWith("entregas");
  });

  it("Error email: PDF OK pero Resend devuelve error — no se marca entrega como validada", async () => {
    mocks.maybeSingleRutas.mockResolvedValue({
      data: mockRutaValida,
      error: null,
    });

    mocks.selectEntregas.mockImplementation(() =>
      asThenable({ data: [{ id: "ent-1" }], error: null })
    );

    mocks.resendSendMock.mockResolvedValue({
      data: null,
      error: {
        message: "Monthly sending limit exceeded",
        name: "rate_limit_exceeded",
      },
    });

    await expect(
      cerrarDespachoYEnviarComprobante("ruta-test-1")
    ).rejects.toThrow(/Resend no pudo enviar el correo/);

    expect(mocks.fromMock).toHaveBeenCalledWith("rutas");
    expect(mocks.resendSendMock).toHaveBeenCalledTimes(1);
    expect(mocks.fromMock).not.toHaveBeenCalledWith("entregas");
  });
});
