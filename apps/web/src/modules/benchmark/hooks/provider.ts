export const normalizeProviderKey = (raw: string) => {
  const id = raw.toLowerCase();
  if (id === "0x") {
    return "zerox";
  }
  return id;
};

export const getProviderIcon = (provider: string): string => {
  switch (provider) {
    case "gluex":
      return "https://icons.llamao.fi/icons/protocols/gluex";
    case "liqdswap":
      return "https://icons.llamao.fi/icons/protocols/liquidswap-hl";
    default:
      return "https://placehold.co/400";
  }
};
