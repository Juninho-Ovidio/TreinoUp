import { fireEvent, render, screen } from "@testing-library/react-native";
import { Avatar, initials } from "../components/Avatar";
import { Button } from "../components/Button";
import { clampProgress, ProgressBar } from "../components/ProgressBar";
import { Segmented } from "../components/Segmented";
import { TextField } from "../components/TextField";
import { resolveScheme, ThemeProvider } from "../theme";

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe("Button", () => {
  it("chama onPress", async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Entrar" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("carregando: fica ocupado e não dispara", async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Salvar" loading onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("Avatar", () => {
  it.each([
    ["Ana Clara Souza", "AS"],
    ["joão", "J"],
    ["  ", "?"],
    [null, "?"],
  ])("iniciais de %p → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it("sem foto mostra as iniciais com rótulo acessível", async () => {
    await wrap(<Avatar name="Bia Pedal" accessibilityLabel="Foto de Bia Pedal" />);
    expect(screen.getByText("BP")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto de Bia Pedal")).toBeOnTheScreen();
  });
});

describe("TextField", () => {
  it("mostra o erro no lugar da dica", async () => {
    await wrap(<TextField label="E-mail" hint="Seu melhor e-mail" error="Digite um e-mail válido." />);
    expect(screen.getByText("Digite um e-mail válido.")).toBeOnTheScreen();
    expect(screen.queryByText("Seu melhor e-mail")).toBeNull();
  });

  it("repassa o texto digitado", async () => {
    const onChange = jest.fn();
    await wrap(<TextField label="Nome" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByLabelText("Nome"), "Ana");
    expect(onChange).toHaveBeenCalledWith("Ana");
  });
});

describe("Segmented", () => {
  it("marca a opção escolhida e avisa a troca", async () => {
    const onChange = jest.fn();
    await wrap(
      <Segmented
        accessibilityLabel="Tema"
        value="light"
        onChange={onChange}
        options={[
          { value: "light", label: "Claro" },
          { value: "dark", label: "Escuro" },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
    fireEvent.press(screen.getByRole("radio", { name: "Escuro" }));
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});

describe("ProgressBar", () => {
  it("limita entre 0 e 1", () => {
    expect(clampProgress(5, 10)).toBe(0.5);
    expect(clampProgress(20, 10)).toBe(1);
    expect(clampProgress(-1, 10)).toBe(0);
    expect(clampProgress(1, 0)).toBe(0);
    expect(clampProgress(Number.NaN, 10)).toBe(0);
  });

  it("expõe o valor em porcentagem", async () => {
    await wrap(<ProgressBar value={3} max={4} accessibilityLabel="Meta semanal" />);
    expect(screen.getByRole("progressbar", { name: "Meta semanal" })).toHaveAccessibilityValue({ now: 75 });
  });
});

describe("resolveScheme", () => {
  it("preferência explícita vence o sistema", () => {
    expect(resolveScheme("dark", "light")).toBe("dark");
    expect(resolveScheme("light", "dark")).toBe("light");
  });
  it("sistema: segue o aparelho, claro se desconhecido", () => {
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", null)).toBe("light");
  });
});
