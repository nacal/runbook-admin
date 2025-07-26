export function PrismStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      /* PrismJS 1.30.0 - YAML Syntax Highlighting */
      .token.comment,
      .token.prolog,
      .token.doctype,
      .token.cdata {
        color: #6a737d;
      }

      .token.punctuation {
        color: #e1e4e8;
      }

      .token.property,
      .token.tag,
      .token.boolean,
      .token.number,
      .token.constant,
      .token.symbol,
      .token.deleted {
        color: #79b8ff;
      }

      .token.selector,
      .token.attr-name,
      .token.string,
      .token.char,
      .token.builtin,
      .token.inserted {
        color: #9ecbff;
      }

      .token.operator,
      .token.entity,
      .token.url,
      .language-css .token.string,
      .style .token.string {
        color: #f97583;
      }

      .token.atrule,
      .token.attr-value,
      .token.keyword {
        color: #f97583;
      }

      .token.function,
      .token.class-name {
        color: #b392f0;
      }

      .token.regex,
      .token.important,
      .token.variable {
        color: #ffab70;
      }

      .token.important,
      .token.bold {
        font-weight: bold;
      }

      .token.italic {
        font-style: italic;
      }

      .token.entity {
        cursor: help;
      }

      /* YAML specific */
      .language-yaml .token.key {
        color: #f97583;
      }

      .language-yaml .token.string {
        color: #9ecbff;
      }

      .language-yaml .token.number {
        color: #79b8ff;
      }

      .language-yaml .token.boolean {
        color: #79b8ff;
      }

      .language-yaml .token.null {
        color: #79b8ff;
      }

      .language-yaml .token.punctuation {
        color: #e1e4e8;
      }
    `,
      }}
    />
  )
}
