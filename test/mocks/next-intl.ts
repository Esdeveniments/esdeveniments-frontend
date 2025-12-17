import React from "react";
import caMessages from "../../messages/ca.json";

type Messages = Record<string, any>;

const getMessage = (messages: Messages, path?: string, key?: string) => {
  if (!key) return undefined;
  const fullKey = path ? `${path}.${key}` : key;
  return fullKey.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in acc) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, messages);
};

const formatTemplate = (
  template: string,
  values?: Record<string, any>
): string => {
  if (!values) return template;
  return Object.entries(values).reduce((acc, [k, v]) => {
    if (typeof v === "string" || typeof v === "number") {
      return acc.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
    return acc;
  }, template);
};

const createTranslator = (namespace?: string) => {
  const t = (key: string, values?: Record<string, any>) => {
    const message = getMessage(caMessages, namespace, key);
    const template =
      typeof message === "string"
        ? message
        : `${namespace ? `${namespace}.` : ""}${key}`;
    return formatTemplate(template, values);
  };

  t.raw = (key: string) => getMessage(caMessages, namespace, key);
  (t as any).has = (key: string) =>
    getMessage(caMessages, namespace, key) !== undefined;

  t.rich = (
    key: string,
    values: Record<string, (chunk: React.ReactNode) => React.ReactNode>
  ) => {
    const raw = t(key);
    return raw.replace(/<(\w+)>(.*?)<\/\1>/g, (_, tag, content) => {
      const renderer = values?.[tag];
      if (!renderer) return content;

      const rendered = renderer(content);
      if (typeof rendered === "string") return rendered;
      if (React.isValidElement(rendered)) {
        const child = (rendered.props as { children?: unknown })?.children;
        return child !== undefined ? String(child) : "";
      }
      return content;
    });
  };

  return t;
};

export const useTranslations = (namespace?: string) =>
  createTranslator(namespace);

export const NextIntlClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => React.createElement(React.Fragment, null, children);

export const getLocale = async () => "ca";
export const getMessages = async () => caMessages;
export const getTranslations = async (
  arg?: string | { locale?: string; namespace?: string }
) => {
  const namespace =
    typeof arg === "string"
      ? arg
      : arg && typeof arg === "object"
        ? arg.namespace
        : undefined;

  return createTranslator(namespace);
};
export const useLocale = () => "ca";
