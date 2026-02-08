// ============================================================================
// BigQuery SQL Validator
// A self-contained TypeScript library for validating SQL against a schema.
// Drop into any Angular/TS project. Zero dependencies.
// ============================================================================

// ─── Public Types ───────────────────────────────────────────────────────────

export interface SchemaColumn {
  name: string;
  type: string; // e.g. "STRING", "INT64", "FLOAT64", "BOOL", "TIMESTAMP", "DATE", "BYTES", "NUMERIC", "BIGNUMERIC", "GEOGRAPHY", "JSON", "ARRAY<STRING>", "STRUCT<field STRING, ...>", etc.
  mode?: "NULLABLE" | "REQUIRED" | "REPEATED"; // default NULLABLE
  description?: string;
  fields?: SchemaColumn[]; // for STRUCT / RECORD types
}

export interface SchemaTable {
  project?: string;
  dataset?: string;
  table: string;
  columns: SchemaColumn[];
}

export interface BQSchema {
  defaultProject?: string;
  defaultDataset?: string;
  tables: SchemaTable[];
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
  code: string; // machine-readable error code
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Parsed statement types found, e.g. ["SELECT","CREATE TABLE"] */
  statementTypes: string[];
}

// ─── Token Types ────────────────────────────────────────────────────────────

enum TokenType {
  // Literals
  Number,
  String,
  BacktickIdent,
  Identifier,
  Parameter, // @param or ?

  // Punctuation
  LeftParen,
  RightParen,
  Comma,
  Dot,
  Semicolon,
  Star,
  Plus,
  Minus,
  Slash,
  Percent,
  Equals,
  NotEquals, // != or <>
  LessThan,
  GreaterThan,
  LessEqual,
  GreaterEqual,
  Pipe, // ||
  LeftBracket,
  RightBracket,
  Arrow, // =>

  // Keywords (we tag known ones)
  Keyword,

  // Special
  EOF,
  Unknown,
}

interface Token {
  type: TokenType;
  value: string;
  upper: string; // uppercase value for keyword matching
  line: number;
  col: number;
}

// ─── Keyword Sets ───────────────────────────────────────────────────────────

const KEYWORDS = new Set([
  "ALL", "AND", "ANY", "ARRAY", "AS", "ASC", "ASSERT_ROWS_MODIFIED",
  "AT", "BETWEEN", "BY", "CASE", "CAST", "COLLATE", "CONTAINS", "CREATE",
  "CROSS", "CUBE", "CURRENT", "DEFAULT", "DEFINE", "DELETE", "DESC",
  "DISTINCT", "ELSE", "END", "ENUM", "ESCAPE", "EXCEPT", "EXCLUDE",
  "EXISTS", "EXTRACT", "FALSE", "FETCH", "FOLLOWING", "FOR", "FROM",
  "FULL", "GROUP", "GROUPING", "GROUPS", "HASH", "HAVING", "IF",
  "IGNORE", "IN", "INNER", "INSERT", "INTERSECT", "INTERVAL", "INTO",
  "IS", "JOIN", "LATERAL", "LEFT", "LIKE", "LIMIT", "LOOKUP", "MERGE",
  "NATURAL", "NEW", "NO", "NOT", "NULL", "NULLS", "OF", "ON", "OR",
  "ORDER", "OUTER", "OVER", "PARTITION", "PRECEDING", "PROTO",
  "QUALIFY", "RANGE", "RECURSIVE", "REPLACE", "RESPECT", "RIGHT",
  "ROLLUP", "ROWS", "SELECT", "SET", "SOME", "STRUCT", "TABLE",
  "TABLESAMPLE", "THEN", "TO", "TREAT", "TRUE", "UNBOUNDED", "UNION",
  "UNNEST", "UPDATE", "USING", "VALUES", "WHEN", "WHERE", "WINDOW",
  "WITH", "WITHIN", "SAFE_CAST", "IFNULL", "COALESCE", "NULLIF",
  "GREATEST", "LEAST", "PIVOT", "UNPIVOT", "TEMP", "TEMPORARY",
  "VIEW", "MATERIALIZED", "FUNCTION", "PROCEDURE", "RETURNS",
  "LANGUAGE", "OPTIONS", "EXTERNAL", "EXPORT", "DATA", "OVERWRITE",
  "TRUNCATE", "DROP", "ALTER", "ADD", "COLUMN", "RENAME", "SCHEMA",
  "DATABASE", "GRANT", "REVOKE", "OFFSET", "ROWS_RANGE", "TYPE",
  "BEGIN", "DECLARE", "EXECUTE", "IMMEDIATE", "LOOP", "WHILE",
  "BREAK", "LEAVE", "CONTINUE", "ITERATE", "REPEAT", "UNTIL",
  "CALL", "RAISE", "RETURN", "TRANSACTION", "COMMIT", "ROLLBACK",
  "EXCEPTION", "DO", "ELSEIF",
]);

const AGGREGATE_FUNCTIONS = new Set([
  "COUNT", "SUM", "AVG", "MIN", "MAX", "ANY_VALUE", "ARRAY_AGG",
  "ARRAY_CONCAT_AGG", "BIT_AND", "BIT_OR", "BIT_XOR", "COUNTIF",
  "LOGICAL_AND", "LOGICAL_OR", "STRING_AGG", "CORR", "COVAR_POP",
  "COVAR_SAMP", "STDDEV", "STDDEV_POP", "STDDEV_SAMP", "VAR_POP",
  "VAR_SAMP", "VARIANCE", "APPROX_COUNT_DISTINCT", "APPROX_QUANTILES",
  "APPROX_TOP_COUNT", "APPROX_TOP_SUM", "HLL_COUNT.INIT",
  "HLL_COUNT.MERGE", "HLL_COUNT.MERGE_PARTIAL", "HLL_COUNT.EXTRACT",
]);

const BUILTIN_FUNCTIONS = new Set([
  // String
  "CONCAT", "LENGTH", "LOWER", "UPPER", "TRIM", "LTRIM", "RTRIM",
  "LPAD", "RPAD", "REPEAT", "REVERSE", "SUBSTR", "SUBSTRING",
  "REPLACE", "REGEXP_CONTAINS", "REGEXP_EXTRACT", "REGEXP_EXTRACT_ALL",
  "REGEXP_REPLACE", "SPLIT", "STARTS_WITH", "ENDS_WITH", "STRPOS",
  "FORMAT", "TO_BASE32", "TO_BASE64", "FROM_BASE32", "FROM_BASE64",
  "TO_HEX", "FROM_HEX", "ASCII", "CHR", "CHAR_LENGTH", "CODE_POINTS_TO_BYTES",
  "CODE_POINTS_TO_STRING", "COLLATE", "CONTAINS_SUBSTR", "EDIT_DISTANCE",
  "INITCAP", "INSTR", "LEFT", "NORMALIZE", "NORMALIZE_AND_CASEFOLD",
  "OCTET_LENGTH", "REGEXP_INSTR", "RIGHT", "SAFE_CONVERT_BYTES_TO_STRING",
  "SOUNDEX", "TO_CODE_POINTS", "TRANSLATE", "UNICODE",
  // Math
  "ABS", "SIGN", "ROUND", "TRUNC", "CEIL", "CEILING", "FLOOR",
  "MOD", "POW", "POWER", "SQRT", "EXP", "LN", "LOG", "LOG10",
  "GREATEST", "LEAST", "DIV", "SAFE_DIVIDE", "SAFE_MULTIPLY",
  "SAFE_NEGATE", "SAFE_ADD", "SAFE_SUBTRACT", "IEEE_DIVIDE",
  "RAND", "GENERATE_UUID", "RANGE_BUCKET",
  // Date/Time
  "CURRENT_DATE", "CURRENT_DATETIME", "CURRENT_TIME", "CURRENT_TIMESTAMP",
  "DATE", "DATETIME", "TIME", "TIMESTAMP", "DATE_ADD", "DATE_SUB",
  "DATE_DIFF", "DATE_TRUNC", "DATETIME_ADD", "DATETIME_SUB",
  "DATETIME_DIFF", "DATETIME_TRUNC", "TIME_ADD", "TIME_SUB",
  "TIME_DIFF", "TIME_TRUNC", "TIMESTAMP_ADD", "TIMESTAMP_SUB",
  "TIMESTAMP_DIFF", "TIMESTAMP_TRUNC", "TIMESTAMP_SECONDS",
  "TIMESTAMP_MILLIS", "TIMESTAMP_MICROS", "UNIX_DATE", "UNIX_SECONDS",
  "UNIX_MILLIS", "UNIX_MICROS", "PARSE_DATE", "PARSE_DATETIME",
  "PARSE_TIME", "PARSE_TIMESTAMP", "FORMAT_DATE", "FORMAT_DATETIME",
  "FORMAT_TIME", "FORMAT_TIMESTAMP", "EXTRACT", "LAST_DAY",
  "GENERATE_DATE_ARRAY", "GENERATE_TIMESTAMP_ARRAY",
  // Type conversion
  "CAST", "SAFE_CAST", "PARSE_JSON", "TO_JSON", "TO_JSON_STRING",
  "BOOL", "INT64", "FLOAT64", "NUMERIC", "BIGNUMERIC", "STRING",
  "BYTES", "DATE", "DATETIME", "TIME", "TIMESTAMP",
  // Array
  "ARRAY_LENGTH", "ARRAY_TO_STRING", "ARRAY_REVERSE",
  "GENERATE_ARRAY", "ARRAY_CONCAT",
  // Struct
  "STRUCT",
  // Conditional
  "IF", "IIF", "IFNULL", "NULLIF", "COALESCE", "CASE",
  // Window / analytic
  "ROW_NUMBER", "RANK", "DENSE_RANK", "PERCENT_RANK", "CUME_DIST",
  "NTILE", "LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE", "NTH_VALUE",
  "PERCENTILE_CONT", "PERCENTILE_DISC",
  // Other
  "EXISTS", "IN", "BETWEEN", "LIKE", "IS", "UNNEST",
  "FARM_FINGERPRINT", "MD5", "SHA1", "SHA256", "SHA512",
  "SESSION_USER", "GENERATE_UUID", "ERROR",
  // JSON
  "JSON_EXTRACT", "JSON_EXTRACT_SCALAR", "JSON_EXTRACT_ARRAY",
  "JSON_EXTRACT_STRING_ARRAY", "JSON_QUERY", "JSON_QUERY_ARRAY",
  "JSON_VALUE", "JSON_VALUE_ARRAY", "JSON_TYPE",
  // Net
  "NET.IP_FROM_STRING", "NET.SAFE_IP_FROM_STRING", "NET.IP_TO_STRING",
  "NET.IP_NET_MASK", "NET.IP_TRUNC", "NET.IPV4_FROM_INT64",
  "NET.IPV4_TO_INT64", "NET.HOST", "NET.PUBLIC_SUFFIX",
  "NET.REG_DOMAIN",
  // Geography
  "ST_GEOGPOINT", "ST_MAKELINE", "ST_MAKEPOLYGON",
  "ST_DISTANCE", "ST_CONTAINS", "ST_INTERSECTS",
  "ST_AREA", "ST_LENGTH", "ST_ASTEXT", "ST_GEOGFROMTEXT",
]);

// ─── Tokenizer ──────────────────────────────────────────────────────────────

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  const peek = () => (pos < sql.length ? sql[pos] : "\0");
  const peekAt = (offset: number) =>
    pos + offset < sql.length ? sql[pos + offset] : "\0";
  const advance = () => {
    const ch = sql[pos++];
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  };

  while (pos < sql.length) {
    const startLine = line;
    const startCol = col;
    const ch = peek();

    // Whitespace
    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    // Single-line comment --
    if (ch === "-" && peekAt(1) === "-") {
      while (pos < sql.length && peek() !== "\n") advance();
      continue;
    }

    // Single-line comment #
    if (ch === "#") {
      while (pos < sql.length && peek() !== "\n") advance();
      continue;
    }

    // Multi-line comment /* */
    if (ch === "/" && peekAt(1) === "*") {
      advance();
      advance();
      while (pos < sql.length && !(peek() === "*" && peekAt(1) === "/")) advance();
      if (pos < sql.length) { advance(); advance(); }
      continue;
    }

    // String literals (single quotes, handle escaping and triple-quotes)
    if (ch === "'") {
      let val = "";
      advance(); // opening '
      // Check for triple-quote
      if (peek() === "'" && peekAt(1) === "'") {
        advance(); advance(); // consume two more '
        // Read until closing '''
        while (pos < sql.length) {
          if (peek() === "'" && peekAt(1) === "'" && peekAt(2) === "'") {
            advance(); advance(); advance();
            break;
          }
          if (peek() === "\\" && pos + 1 < sql.length) { val += advance(); }
          val += advance();
        }
      } else {
        while (pos < sql.length && peek() !== "'") {
          if (peek() === "\\" && pos + 1 < sql.length) { val += advance(); }
          val += advance();
        }
        if (peek() === "'") advance();
      }
      tokens.push({ type: TokenType.String, value: val, upper: val.toUpperCase(), line: startLine, col: startCol });
      continue;
    }

    // Double-quoted string / identifier
    if (ch === '"') {
      let val = "";
      advance();
      while (pos < sql.length && peek() !== '"') {
        if (peek() === "\\" && pos + 1 < sql.length) { val += advance(); }
        val += advance();
      }
      if (peek() === '"') advance();
      tokens.push({ type: TokenType.String, value: val, upper: val.toUpperCase(), line: startLine, col: startCol });
      continue;
    }

    // Backtick-quoted identifier
    if (ch === "`") {
      let val = "";
      advance();
      while (pos < sql.length && peek() !== "`") {
        val += advance();
      }
      if (peek() === "`") advance();
      tokens.push({ type: TokenType.BacktickIdent, value: val, upper: val.toUpperCase(), line: startLine, col: startCol });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(peekAt(1)))) {
      let num = "";
      // Hex literal
      if (ch === "0" && (peekAt(1) === "x" || peekAt(1) === "X")) {
        num += advance(); num += advance();
        while (/[0-9a-fA-F]/.test(peek())) num += advance();
      } else {
        while (/[0-9]/.test(peek())) num += advance();
        if (peek() === "." && /[0-9]/.test(peekAt(1))) {
          num += advance();
          while (/[0-9]/.test(peek())) num += advance();
        }
        if ((peek() === "e" || peek() === "E")) {
          num += advance();
          if (peek() === "+" || peek() === "-") num += advance();
          while (/[0-9]/.test(peek())) num += advance();
        }
      }
      tokens.push({ type: TokenType.Number, value: num, upper: num, line: startLine, col: startCol });
      continue;
    }

    // Identifiers / keywords (including r"", b"", etc. prefixed strings)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (/[a-zA-Z0-9_]/.test(peek())) ident += advance();
      const upper = ident.toUpperCase();

      // Handle byte/raw string prefixes
      if ((upper === "B" || upper === "R" || upper === "BR" || upper === "RB") && (peek() === "'" || peek() === '"')) {
        const q = advance();
        let val = "";
        while (pos < sql.length && peek() !== q) {
          if (peek() === "\\" && pos + 1 < sql.length) val += advance();
          val += advance();
        }
        if (peek() === q) advance();
        tokens.push({ type: TokenType.String, value: val, upper: val.toUpperCase(), line: startLine, col: startCol });
        continue;
      }

      const type = KEYWORDS.has(upper) ? TokenType.Keyword : TokenType.Identifier;
      tokens.push({ type, value: ident, upper, line: startLine, col: startCol });
      continue;
    }

    // Parameter markers
    if (ch === "@") {
      advance();
      let param = "@";
      while (/[a-zA-Z0-9_]/.test(peek())) param += advance();
      tokens.push({ type: TokenType.Parameter, value: param, upper: param.toUpperCase(), line: startLine, col: startCol });
      continue;
    }
    if (ch === "?") {
      advance();
      tokens.push({ type: TokenType.Parameter, value: "?", upper: "?", line: startLine, col: startCol });
      continue;
    }

    // Two-character operators
    if (ch === "!" && peekAt(1) === "=") {
      advance(); advance();
      tokens.push({ type: TokenType.NotEquals, value: "!=", upper: "!=", line: startLine, col: startCol });
      continue;
    }
    if (ch === "<" && peekAt(1) === ">") {
      advance(); advance();
      tokens.push({ type: TokenType.NotEquals, value: "<>", upper: "<>", line: startLine, col: startCol });
      continue;
    }
    if (ch === "<" && peekAt(1) === "=") {
      advance(); advance();
      tokens.push({ type: TokenType.LessEqual, value: "<=", upper: "<=", line: startLine, col: startCol });
      continue;
    }
    if (ch === ">" && peekAt(1) === "=") {
      advance(); advance();
      tokens.push({ type: TokenType.GreaterEqual, value: ">=", upper: ">=", line: startLine, col: startCol });
      continue;
    }
    if (ch === "|" && peekAt(1) === "|") {
      advance(); advance();
      tokens.push({ type: TokenType.Pipe, value: "||", upper: "||", line: startLine, col: startCol });
      continue;
    }
    if (ch === "=" && peekAt(1) === ">") {
      advance(); advance();
      tokens.push({ type: TokenType.Arrow, value: "=>", upper: "=>", line: startLine, col: startCol });
      continue;
    }

    // Single-character tokens
    const singleCharMap: Record<string, TokenType> = {
      "(": TokenType.LeftParen,
      ")": TokenType.RightParen,
      ",": TokenType.Comma,
      ".": TokenType.Dot,
      ";": TokenType.Semicolon,
      "*": TokenType.Star,
      "+": TokenType.Plus,
      "-": TokenType.Minus,
      "/": TokenType.Slash,
      "%": TokenType.Percent,
      "=": TokenType.Equals,
      "<": TokenType.LessThan,
      ">": TokenType.GreaterThan,
      "[": TokenType.LeftBracket,
      "]": TokenType.RightBracket,
    };

    if (singleCharMap[ch] !== undefined) {
      advance();
      tokens.push({ type: singleCharMap[ch], value: ch, upper: ch, line: startLine, col: startCol });
      continue;
    }

    // Unknown character
    advance();
    tokens.push({ type: TokenType.Unknown, value: ch, upper: ch, line: startLine, col: startCol });
  }

  tokens.push({ type: TokenType.EOF, value: "", upper: "", line, col });
  return tokens;
}

// ─── Parser / Validator ─────────────────────────────────────────────────────

class SQLValidator {
  private tokens: Token[] = [];
  private pos = 0;
  private errors: ValidationError[] = [];
  private schema: BQSchema;
  private cteNames: Set<string> = new Set();
  private statementTypes: string[] = [];

  // Build a lookup map from the schema
  private tableMap: Map<string, SchemaTable> = new Map();

  constructor(schema: BQSchema) {
    this.schema = schema;
    this.buildTableMap();
  }

  private buildTableMap() {
    for (const t of this.schema.tables) {
      // Store under multiple possible reference forms
      const keys: string[] = [];
      const tName = t.table.toUpperCase();
      const dName = (t.dataset || this.schema.defaultDataset || "").toUpperCase();
      const pName = (t.project || this.schema.defaultProject || "").toUpperCase();

      keys.push(tName);
      if (dName) {
        keys.push(`${dName}.${tName}`);
        if (pName) {
          keys.push(`${pName}.${dName}.${tName}`);
        }
      }
      for (const k of keys) {
        this.tableMap.set(k, t);
      }
    }
  }

  private peek(): Token {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  }

  private peekAt(offset: number): Token {
    const idx = this.pos + offset;
    return this.tokens[idx] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
  }

  private isKeyword(value: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.Keyword || t.type === TokenType.Identifier) && t.upper === value;
  }

  private matchKeyword(value: string): boolean {
    if (this.isKeyword(value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, errorMsg: string): Token | null {
    const t = this.peek();
    if (t.type === type) {
      return this.advance();
    }
    this.addError(errorMsg, t, "SYNTAX_ERROR");
    return null;
  }

  private expectKeyword(kw: string, errorMsg: string): boolean {
    if (this.isKeyword(kw)) {
      this.advance();
      return true;
    }
    this.addError(errorMsg, this.peek(), "SYNTAX_ERROR");
    return false;
  }

  private addError(message: string, token: Token, code: string, severity: "error" | "warning" = "error") {
    this.errors.push({
      message,
      line: token.line,
      column: token.col,
      severity,
      code,
    });
  }

  // ──── Main Entry Point ────────────────────────────────────────────────────

  validate(sql: string): ValidationResult {
    this.tokens = tokenize(sql);
    this.pos = 0;
    this.errors = [];
    this.cteNames = new Set();
    this.statementTypes = [];

    if (this.tokens.length <= 1) {
      return { valid: false, errors: [{ message: "Empty SQL statement", severity: "error", code: "EMPTY_SQL" }], statementTypes: [] };
    }

    try {
      this.parseStatements();
    } catch (e: any) {
      if (!this.errors.length) {
        this.errors.push({ message: `Parse error: ${e.message}`, severity: "error", code: "PARSE_ERROR" });
      }
    }

    return {
      valid: this.errors.filter((e) => e.severity === "error").length === 0,
      errors: this.errors,
      statementTypes: this.statementTypes,
    };
  }

  // ──── Statement-Level Parsing ─────────────────────────────────────────────

  private parseStatements() {
    while (this.peek().type !== TokenType.EOF) {
      this.parseStatement();
      // Consume optional semicolons between statements
      while (this.peek().type === TokenType.Semicolon) this.advance();
    }
  }

  private parseStatement() {
    const t = this.peek();

    // WITH ... SELECT (CTE)
    if (this.isKeyword("WITH")) {
      this.statementTypes.push("SELECT");
      this.parseCTE();
      return;
    }

    // SELECT
    if (this.isKeyword("SELECT")) {
      this.statementTypes.push("SELECT");
      this.parseSelect();
      return;
    }

    // INSERT
    if (this.isKeyword("INSERT")) {
      this.statementTypes.push("INSERT");
      this.parseInsert();
      return;
    }

    // UPDATE
    if (this.isKeyword("UPDATE")) {
      this.statementTypes.push("UPDATE");
      this.parseUpdate();
      return;
    }

    // DELETE
    if (this.isKeyword("DELETE")) {
      this.statementTypes.push("DELETE");
      this.parseDelete();
      return;
    }

    // MERGE
    if (this.isKeyword("MERGE")) {
      this.statementTypes.push("MERGE");
      this.parseMerge();
      return;
    }

    // CREATE TABLE / VIEW / FUNCTION / PROCEDURE / etc.
    if (this.isKeyword("CREATE")) {
      this.parseCreate();
      return;
    }

    // DROP
    if (this.isKeyword("DROP")) {
      this.statementTypes.push("DROP");
      this.skipToStatementEnd();
      return;
    }

    // ALTER
    if (this.isKeyword("ALTER")) {
      this.statementTypes.push("ALTER");
      this.skipToStatementEnd();
      return;
    }

    // TRUNCATE
    if (this.isKeyword("TRUNCATE")) {
      this.statementTypes.push("TRUNCATE");
      this.skipToStatementEnd();
      return;
    }

    // DECLARE (scripting)
    if (this.isKeyword("DECLARE")) {
      this.statementTypes.push("DECLARE");
      this.skipToStatementEnd();
      return;
    }

    // SET (scripting)
    if (this.isKeyword("SET")) {
      this.statementTypes.push("SET");
      this.skipToStatementEnd();
      return;
    }

    // BEGIN (scripting block)
    if (this.isKeyword("BEGIN")) {
      this.statementTypes.push("BEGIN");
      this.advance();
      // Parse inner statements until END
      while (!this.isKeyword("END") && this.peek().type !== TokenType.EOF) {
        this.parseStatement();
        while (this.peek().type === TokenType.Semicolon) this.advance();
      }
      if (this.isKeyword("END")) this.advance();
      return;
    }

    // CALL
    if (this.isKeyword("CALL")) {
      this.statementTypes.push("CALL");
      this.skipToStatementEnd();
      return;
    }

    // EXPORT DATA
    if (this.isKeyword("EXPORT")) {
      this.statementTypes.push("EXPORT DATA");
      this.skipToStatementEnd();
      return;
    }

    // GRANT / REVOKE
    if (this.isKeyword("GRANT") || this.isKeyword("REVOKE")) {
      this.statementTypes.push(t.upper);
      this.skipToStatementEnd();
      return;
    }

    // IF / WHILE / LOOP / FOR / REPEAT (scripting)
    if (this.isKeyword("IF") || this.isKeyword("WHILE") || this.isKeyword("LOOP") || this.isKeyword("FOR") || this.isKeyword("REPEAT")) {
      this.statementTypes.push(t.upper);
      this.skipToStatementEnd();
      return;
    }

    // Unknown statement
    this.addError(`Unexpected token '${t.value}'. Expected a SQL statement (SELECT, INSERT, UPDATE, DELETE, CREATE, etc.)`, t, "UNEXPECTED_TOKEN");
    this.advance();
  }

  private skipToStatementEnd() {
    let depth = 0;
    while (this.peek().type !== TokenType.EOF) {
      const t = this.peek();
      if (t.type === TokenType.LeftParen) depth++;
      if (t.type === TokenType.RightParen) depth--;
      if (t.type === TokenType.Semicolon && depth <= 0) return;

      // Handle BEGIN...END blocks
      if (this.isKeyword("BEGIN")) depth++;
      if (this.isKeyword("END") && depth > 0) depth--;

      this.advance();
    }
  }

  // ──── CTE ─────────────────────────────────────────────────────────────────

  private parseCTE() {
    this.advance(); // WITH
    this.matchKeyword("RECURSIVE"); // optional

    // Parse CTE definitions
    do {
      const name = this.parseIdentifier();
      if (name) {
        this.cteNames.add(name.toUpperCase());
      }
      this.expectKeyword("AS", "Expected AS after CTE name");
      this.expect(TokenType.LeftParen, "Expected '(' after AS in CTE");
      this.parseSelect(); // inner query
      this.expect(TokenType.RightParen, "Expected ')' to close CTE definition");
    } while (this.matchComma());

    // Now parse the main query
    if (this.isKeyword("SELECT")) {
      this.parseSelect();
    } else if (this.isKeyword("INSERT")) {
      this.parseInsert();
    } else if (this.isKeyword("UPDATE")) {
      this.parseUpdate();
    } else if (this.isKeyword("DELETE")) {
      this.parseDelete();
    } else if (this.isKeyword("MERGE")) {
      this.parseMerge();
    } else {
      this.addError("Expected SELECT, INSERT, UPDATE, DELETE, or MERGE after WITH clause", this.peek(), "SYNTAX_ERROR");
    }
  }

  // ──── SELECT ──────────────────────────────────────────────────────────────

  private parseSelect(): SelectInfo {
    this.advance(); // SELECT
    this.matchKeyword("DISTINCT");
    this.matchKeyword("ALL");
    this.matchKeyword("AS"); // SELECT AS STRUCT / SELECT AS VALUE
    if (this.isKeyword("STRUCT") || this.isKeyword("VALUE")) this.advance();

    // Parse select list
    const columns = this.parseSelectList();

    let fromTables: ResolvedTable[] = [];

    // FROM
    if (this.isKeyword("FROM")) {
      this.advance();
      fromTables = this.parseFromClause();
    }

    // WHERE
    if (this.isKeyword("WHERE")) {
      this.advance();
      this.parseExpression(fromTables);
    }

    // GROUP BY
    let hasGroupBy = false;
    if (this.isKeyword("GROUP")) {
      hasGroupBy = true;
      this.advance();
      this.expectKeyword("BY", "Expected BY after GROUP");
      this.parseGroupByList(fromTables);
    }

    // HAVING
    if (this.isKeyword("HAVING")) {
      if (!hasGroupBy) {
        this.addError("HAVING clause without GROUP BY", this.peek(), "HAVING_WITHOUT_GROUP_BY", "warning");
      }
      this.advance();
      this.parseExpression(fromTables);
    }

    // QUALIFY (BigQuery-specific)
    if (this.isKeyword("QUALIFY")) {
      this.advance();
      this.parseExpression(fromTables);
    }

    // WINDOW
    if (this.isKeyword("WINDOW")) {
      this.advance();
      this.parseWindowClause();
    }

    // ORDER BY
    if (this.isKeyword("ORDER")) {
      this.advance();
      this.expectKeyword("BY", "Expected BY after ORDER");
      this.parseOrderByList(fromTables);
    }

    // LIMIT / OFFSET
    if (this.isKeyword("LIMIT")) {
      this.advance();
      this.parseExpression(fromTables);
      if (this.isKeyword("OFFSET")) {
        this.advance();
        this.parseExpression(fromTables);
      }
    }

    // UNION / INTERSECT / EXCEPT
    if (this.isKeyword("UNION") || this.isKeyword("INTERSECT") || this.isKeyword("EXCEPT")) {
      const op = this.advance();
      this.matchKeyword("ALL");
      this.matchKeyword("DISTINCT");
      if (this.isKeyword("SELECT")) {
        this.parseSelect();
      } else if (this.peek().type === TokenType.LeftParen) {
        this.advance();
        this.parseSelect();
        this.expect(TokenType.RightParen, "Expected ')' after subquery in set operation");
      }
    }

    return { columns, fromTables };
  }

  // ──── Select List ─────────────────────────────────────────────────────────

  private parseSelectList(): string[] {
    const columns: string[] = [];
    do {
      // * or table.*
      if (this.peek().type === TokenType.Star) {
        this.advance();
        columns.push("*");
        // Check for EXCEPT or REPLACE
        if (this.isKeyword("EXCEPT") || this.isKeyword("REPLACE")) {
          this.advance();
          this.expect(TokenType.LeftParen, "Expected '(' after EXCEPT/REPLACE");
          this.parseExpressionList([]);
          this.expect(TokenType.RightParen, "Expected ')'");
        }
        continue;
      }

      this.parseExpression([]);

      // Check for table.* after expression parsing
      if (this.peek().type === TokenType.Star) {
        this.advance();
        columns.push("*");
        if (this.isKeyword("EXCEPT") || this.isKeyword("REPLACE")) {
          this.advance();
          this.expect(TokenType.LeftParen, "Expected '(' after EXCEPT/REPLACE");
          this.parseExpressionList([]);
          this.expect(TokenType.RightParen, "Expected ')'");
        }
        continue;
      }

      // Optional alias
      let alias = "";
      if (this.isKeyword("AS")) {
        this.advance();
        alias = this.parseIdentifier() || "";
      } else if (
        this.peek().type === TokenType.Identifier &&
        !this.isSelectTerminator()
      ) {
        alias = this.parseIdentifier() || "";
      }
      columns.push(alias || "expr");
    } while (this.matchComma());

    return columns;
  }

  private isSelectTerminator(): boolean {
    const t = this.peek();
    return (
      t.type === TokenType.EOF ||
      t.type === TokenType.Semicolon ||
      t.type === TokenType.RightParen ||
      this.isKeyword("FROM") ||
      this.isKeyword("WHERE") ||
      this.isKeyword("GROUP") ||
      this.isKeyword("HAVING") ||
      this.isKeyword("ORDER") ||
      this.isKeyword("LIMIT") ||
      this.isKeyword("UNION") ||
      this.isKeyword("INTERSECT") ||
      this.isKeyword("EXCEPT") ||
      this.isKeyword("QUALIFY") ||
      this.isKeyword("WINDOW") ||
      this.isKeyword("ON") ||
      this.isKeyword("USING") ||
      this.isKeyword("JOIN") ||
      this.isKeyword("INNER") ||
      this.isKeyword("LEFT") ||
      this.isKeyword("RIGHT") ||
      this.isKeyword("FULL") ||
      this.isKeyword("CROSS") ||
      this.isKeyword("THEN") ||
      this.isKeyword("WHEN") ||
      this.isKeyword("SET") ||
      this.isKeyword("VALUES")
    );
  }

  // ──── FROM clause ─────────────────────────────────────────────────────────

  private parseFromClause(): ResolvedTable[] {
    const tables: ResolvedTable[] = [];
    tables.push(...this.parseTableRef());

    // Additional JOINs
    while (this.isJoinKeyword()) {
      this.parseJoin(tables);
    }

    // Comma-joined tables
    while (this.matchComma()) {
      tables.push(...this.parseTableRef());
      while (this.isJoinKeyword()) {
        this.parseJoin(tables);
      }
    }

    return tables;
  }

  private isJoinKeyword(): boolean {
    return (
      this.isKeyword("JOIN") ||
      this.isKeyword("INNER") ||
      this.isKeyword("LEFT") ||
      this.isKeyword("RIGHT") ||
      this.isKeyword("FULL") ||
      this.isKeyword("CROSS")
    );
  }

  private parseJoin(tables: ResolvedTable[]) {
    // Consume join type keywords
    this.matchKeyword("INNER");
    this.matchKeyword("LEFT");
    this.matchKeyword("RIGHT");
    this.matchKeyword("FULL");
    this.matchKeyword("CROSS");
    this.matchKeyword("OUTER");
    this.expectKeyword("JOIN", "Expected JOIN keyword");

    tables.push(...this.parseTableRef());

    // ON or USING
    if (this.isKeyword("ON")) {
      this.advance();
      this.parseExpression(tables);
    } else if (this.isKeyword("USING")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after USING");
      this.parseIdentifierList();
      this.expect(TokenType.RightParen, "Expected ')' after USING columns");
    }
  }

  private parseTableRef(): ResolvedTable[] {
    const results: ResolvedTable[] = [];

    // Subquery
    if (this.peek().type === TokenType.LeftParen) {
      this.advance();
      if (this.isKeyword("SELECT") || this.isKeyword("WITH")) {
        this.parseSelect();
      }
      this.expect(TokenType.RightParen, "Expected ')' to close subquery");
      // Optional alias
      this.matchKeyword("AS");
      const alias = this.parseIdentifierOptional();
      results.push({ alias: alias || "__subquery__", columns: [] });
      return results;
    }

    // UNNEST(...)
    if (this.isKeyword("UNNEST")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after UNNEST");
      this.parseExpression([]);
      this.expect(TokenType.RightParen, "Expected ')' after UNNEST expression");
      this.matchKeyword("AS");
      const alias = this.parseIdentifierOptional();
      // WITH OFFSET
      if (this.isKeyword("WITH")) {
        this.advance();
        this.expectKeyword("OFFSET", "Expected OFFSET after WITH");
        this.matchKeyword("AS");
        this.parseIdentifierOptional();
      }
      results.push({ alias: alias || "__unnest__", columns: [] });
      return results;
    }

    // Table name (possibly multi-part: project.dataset.table)
    const tableName = this.parseTableName();
    if (!tableName) {
      return results;
    }

    // Look up in schema
    const resolved = this.resolveTable(tableName);
    if (!resolved) {
      const token = this.tokens[this.pos - 1] || this.peek();
      // Don't error on CTEs
      if (!this.cteNames.has(tableName.toUpperCase())) {
        this.addError(`Table '${tableName}' not found in schema`, token, "TABLE_NOT_FOUND");
      }
    }

    // TABLESAMPLE
    if (this.isKeyword("TABLESAMPLE")) {
      this.advance();
      this.expectKeyword("SYSTEM", "Expected SYSTEM after TABLESAMPLE");
      this.expect(TokenType.LeftParen, "Expected '('");
      this.parseExpression([]);
      this.matchKeyword("PERCENT");
      this.expect(TokenType.RightParen, "Expected ')'");
    }

    // FOR SYSTEM_TIME AS OF
    if (this.isKeyword("FOR")) {
      this.advance();
      // skip tokens until we get past the time travel clause
      while (!this.isSelectTerminator() && !this.isJoinKeyword() && !this.matchComma() && this.peek().type !== TokenType.EOF) {
        if (this.isKeyword("AS")) break;
        this.advance();
      }
    }

    // Optional alias
    this.matchKeyword("AS");
    const alias = this.parseIdentifierOptional();

    results.push({
      alias: alias || tableName,
      columns: resolved ? resolved.columns.map((c) => c.name) : [],
      schemaTable: resolved || undefined,
    });

    return results;
  }

  private parseTableName(): string | null {
    let name = "";
    const first = this.parseIdentifier();
    if (!first) return null;
    name = first;

    while (this.peek().type === TokenType.Dot) {
      this.advance();
      const part = this.parseIdentifier();
      if (!part) break;
      name += "." + part;
    }
    return name;
  }

  private resolveTable(name: string): SchemaTable | null {
    const upper = name.toUpperCase();
    return this.tableMap.get(upper) || null;
  }

  // ──── Expressions ─────────────────────────────────────────────────────────

  private parseExpression(tables: ResolvedTable[]) {
    this.parseOrExpression(tables);
  }

  private parseOrExpression(tables: ResolvedTable[]) {
    this.parseAndExpression(tables);
    while (this.isKeyword("OR")) {
      this.advance();
      this.parseAndExpression(tables);
    }
  }

  private parseAndExpression(tables: ResolvedTable[]) {
    this.parseNotExpression(tables);
    while (this.isKeyword("AND")) {
      this.advance();
      this.parseNotExpression(tables);
    }
  }

  private parseNotExpression(tables: ResolvedTable[]) {
    if (this.isKeyword("NOT")) {
      this.advance();
    }
    this.parseComparison(tables);
  }

  private parseComparison(tables: ResolvedTable[]) {
    this.parseAddition(tables);

    const t = this.peek();

    // IS [NOT] NULL / IS [NOT] TRUE / IS [NOT] FALSE
    if (this.isKeyword("IS")) {
      this.advance();
      this.matchKeyword("NOT");
      if (this.isKeyword("NULL") || this.isKeyword("TRUE") || this.isKeyword("FALSE") || this.isKeyword("UNKNOWN")) {
        this.advance();
      } else if (this.isKeyword("DISTINCT")) {
        this.advance();
        this.expectKeyword("FROM", "Expected FROM after IS DISTINCT");
        this.parseAddition(tables);
      }
      return;
    }

    // [NOT] IN
    if (this.isKeyword("NOT")) {
      const saved = this.pos;
      this.advance();
      if (this.isKeyword("IN")) {
        this.advance();
        this.parseInExpression(tables);
        return;
      }
      if (this.isKeyword("LIKE")) {
        this.advance();
        this.parseAddition(tables);
        return;
      }
      if (this.isKeyword("BETWEEN")) {
        this.advance();
        this.parseAddition(tables);
        this.expectKeyword("AND", "Expected AND in BETWEEN expression");
        this.parseAddition(tables);
        return;
      }
      this.pos = saved;
    }

    if (this.isKeyword("IN")) {
      this.advance();
      this.parseInExpression(tables);
      return;
    }

    // BETWEEN
    if (this.isKeyword("BETWEEN")) {
      this.advance();
      this.parseAddition(tables);
      this.expectKeyword("AND", "Expected AND in BETWEEN expression");
      this.parseAddition(tables);
      return;
    }

    // LIKE
    if (this.isKeyword("LIKE")) {
      this.advance();
      this.parseAddition(tables);
      return;
    }

    // Comparison operators
    if (
      t.type === TokenType.Equals ||
      t.type === TokenType.NotEquals ||
      t.type === TokenType.LessThan ||
      t.type === TokenType.GreaterThan ||
      t.type === TokenType.LessEqual ||
      t.type === TokenType.GreaterEqual
    ) {
      this.advance();
      // ANY / ALL / SOME
      this.matchKeyword("ANY");
      this.matchKeyword("ALL");
      this.matchKeyword("SOME");
      this.parseAddition(tables);
    }
  }

  private parseInExpression(tables: ResolvedTable[]) {
    if (this.isKeyword("UNNEST")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after UNNEST");
      this.parseExpression(tables);
      this.expect(TokenType.RightParen, "Expected ')'");
      return;
    }

    this.expect(TokenType.LeftParen, "Expected '(' after IN");
    if (this.isKeyword("SELECT") || this.isKeyword("WITH")) {
      this.parseSelect();
    } else {
      this.parseExpressionList(tables);
    }
    this.expect(TokenType.RightParen, "Expected ')'");
  }

  private parseAddition(tables: ResolvedTable[]) {
    this.parseMultiplication(tables);
    while (
      this.peek().type === TokenType.Plus ||
      this.peek().type === TokenType.Minus ||
      this.peek().type === TokenType.Pipe // || for string concat
    ) {
      this.advance();
      this.parseMultiplication(tables);
    }
  }

  private parseMultiplication(tables: ResolvedTable[]) {
    this.parseUnary(tables);
    while (
      this.peek().type === TokenType.Star ||
      this.peek().type === TokenType.Slash ||
      this.peek().type === TokenType.Percent
    ) {
      this.advance();
      this.parseUnary(tables);
    }
  }

  private parseUnary(tables: ResolvedTable[]) {
    if (this.peek().type === TokenType.Minus || this.peek().type === TokenType.Plus) {
      this.advance();
    }
    this.parsePrimary(tables);
  }

  private parsePrimary(tables: ResolvedTable[]) {
    const t = this.peek();

    // NULL
    if (this.isKeyword("NULL")) {
      this.advance();
      this.parsePostfix(tables);
      return;
    }

    // TRUE / FALSE
    if (this.isKeyword("TRUE") || this.isKeyword("FALSE")) {
      this.advance();
      this.parsePostfix(tables);
      return;
    }

    // Number
    if (t.type === TokenType.Number) {
      this.advance();
      this.parsePostfix(tables);
      return;
    }

    // String
    if (t.type === TokenType.String) {
      this.advance();
      this.parsePostfix(tables);
      return;
    }

    // Parameter
    if (t.type === TokenType.Parameter) {
      this.advance();
      this.parsePostfix(tables);
      return;
    }

    // Parenthesized expression or subquery
    if (t.type === TokenType.LeftParen) {
      this.advance();
      if (this.isKeyword("SELECT") || this.isKeyword("WITH")) {
        this.parseSelect();
      } else {
        this.parseExpression(tables);
        // Might be a tuple
        while (this.matchComma()) {
          this.parseExpression(tables);
        }
      }
      this.expect(TokenType.RightParen, "Expected ')'");
      this.parsePostfix(tables);
      return;
    }

    // CASE expression
    if (this.isKeyword("CASE")) {
      this.advance();
      if (!this.isKeyword("WHEN")) {
        this.parseExpression(tables); // simple CASE value
      }
      while (this.isKeyword("WHEN")) {
        this.advance();
        this.parseExpression(tables);
        this.expectKeyword("THEN", "Expected THEN after WHEN condition");
        this.parseExpression(tables);
      }
      if (this.isKeyword("ELSE")) {
        this.advance();
        this.parseExpression(tables);
      }
      this.expectKeyword("END", "Expected END to close CASE expression");
      this.parsePostfix(tables);
      return;
    }

    // EXISTS ( subquery )
    if (this.isKeyword("EXISTS")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after EXISTS");
      this.parseSelect();
      this.expect(TokenType.RightParen, "Expected ')'");
      this.parsePostfix(tables);
      return;
    }

    // ARRAY [<type>] [ ... ] or ARRAY( subquery )
    if (this.isKeyword("ARRAY")) {
      this.advance();
      if (this.peek().type === TokenType.LeftParen) {
        this.advance();
        this.parseSelect();
        this.expect(TokenType.RightParen, "Expected ')'");
      } else if (this.peek().type === TokenType.LessThan) {
        // Type specification - skip it
        this.skipTypeSpec();
        if (this.peek().type === TokenType.LeftBracket) {
          this.advance();
          if (this.peek().type !== TokenType.RightBracket) {
            this.parseExpressionList(tables);
          }
          this.expect(TokenType.RightBracket, "Expected ']'");
        }
      } else if (this.peek().type === TokenType.LeftBracket) {
        this.advance();
        if (this.peek().type !== TokenType.RightBracket) {
          this.parseExpressionList(tables);
        }
        this.expect(TokenType.RightBracket, "Expected ']'");
      }
      this.parsePostfix(tables);
      return;
    }

    // STRUCT
    if (this.isKeyword("STRUCT")) {
      this.advance();
      if (this.peek().type === TokenType.LessThan) {
        this.skipTypeSpec();
      }
      this.expect(TokenType.LeftParen, "Expected '(' after STRUCT");
      if (this.peek().type !== TokenType.RightParen) {
        this.parseExpressionList(tables);
      }
      this.expect(TokenType.RightParen, "Expected ')'");
      this.parsePostfix(tables);
      return;
    }

    // INTERVAL
    if (this.isKeyword("INTERVAL")) {
      this.advance();
      this.parseExpression(tables);
      // DAY, HOUR, MINUTE, SECOND, etc.
      if (this.peek().type === TokenType.Identifier || this.peek().type === TokenType.Keyword) {
        this.advance();
      }
      this.parsePostfix(tables);
      return;
    }

    // CAST / SAFE_CAST
    if (this.isKeyword("CAST") || this.isKeyword("SAFE_CAST")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after CAST");
      this.parseExpression(tables);
      this.expectKeyword("AS", "Expected AS in CAST expression");
      this.parseTypeExpression();
      this.expect(TokenType.RightParen, "Expected ')'");
      this.parsePostfix(tables);
      return;
    }

    // EXTRACT( part FROM expr )
    if (this.isKeyword("EXTRACT")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after EXTRACT");
      this.advance(); // date part keyword
      this.expectKeyword("FROM", "Expected FROM in EXTRACT");
      this.parseExpression(tables);
      this.expect(TokenType.RightParen, "Expected ')'");
      this.parsePostfix(tables);
      return;
    }

    // IF( cond, then, else )
    if (this.isKeyword("IF")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '(' after IF");
      this.parseExpression(tables);
      this.expect(TokenType.Comma, "Expected ',' after IF condition");
      this.parseExpression(tables);
      this.expect(TokenType.Comma, "Expected ',' after IF true branch");
      this.parseExpression(tables);
      this.expect(TokenType.RightParen, "Expected ')'");
      this.parsePostfix(tables);
      return;
    }

    // Star (for COUNT(*))
    if (t.type === TokenType.Star) {
      this.advance();
      this.parsePostfix(tables);
      return;
    }

    // Identifier: could be column ref, table.column, or function call
    if (t.type === TokenType.Identifier || t.type === TokenType.Keyword || t.type === TokenType.BacktickIdent) {
      let name = t.value;
      const nameUpper = t.upper;
      this.advance();

      // Check for function call: name(
      if (this.peek().type === TokenType.LeftParen) {
        // It's a function call
        this.parseFunctionCall(name, tables);
        this.parsePostfix(tables);
        return;
      }

      // Dot-separated reference: a.b.c
      const parts = [name];
      while (this.peek().type === TokenType.Dot) {
        this.advance();
        if (this.peek().type === TokenType.Star) {
          // table.* - leave it for the caller to consume
          break;
        }
        const next = this.parseIdentifier();
        if (next) {
          parts.push(next);
          // Could be a function with dotted name like NET.IP_FROM_STRING(...)
          if (this.peek().type === TokenType.LeftParen) {
            this.parseFunctionCall(parts.join("."), tables);
            this.parsePostfix(tables);
            return;
          }
        } else {
          break;
        }
      }

      // Validate column reference if we have tables
      if (tables.length > 0 && parts.length >= 1) {
        this.validateColumnRef(parts, tables);
      }

      this.parsePostfix(tables);
      return;
    }

    // Array literal [ ... ]
    if (t.type === TokenType.LeftBracket) {
      this.advance();
      if (this.peek().type !== TokenType.RightBracket) {
        this.parseExpressionList(tables);
      }
      this.expect(TokenType.RightBracket, "Expected ']'");
      this.parsePostfix(tables);
      return;
    }

    // If nothing matched, it's a syntax error
    this.addError(`Unexpected token '${t.value}'`, t, "UNEXPECTED_TOKEN");
    this.advance();
  }

  private parsePostfix(tables: ResolvedTable[]) {
    // Array subscript [expr]
    while (this.peek().type === TokenType.LeftBracket) {
      this.advance();
      // ORDINAL, OFFSET, SAFE_ORDINAL, SAFE_OFFSET
      if (this.isKeyword("ORDINAL") || this.isKeyword("OFFSET") || this.isKeyword("SAFE_ORDINAL") || this.isKeyword("SAFE_OFFSET")) {
        this.advance();
        this.expect(TokenType.LeftParen, "Expected '('");
        this.parseExpression(tables);
        this.expect(TokenType.RightParen, "Expected ')'");
      } else {
        this.parseExpression(tables);
      }
      this.expect(TokenType.RightBracket, "Expected ']'");
    }

    // Dot access after postfix
    while (this.peek().type === TokenType.Dot) {
      this.advance();
      if (this.peek().type !== TokenType.Star) {
        this.parseIdentifier();
      }
    }
  }

  private parseFunctionCall(name: string, tables: ResolvedTable[]) {
    const upper = name.toUpperCase();

    // Validate function exists
    if (
      !BUILTIN_FUNCTIONS.has(upper) &&
      !AGGREGATE_FUNCTIONS.has(upper) &&
      !KEYWORDS.has(upper) &&
      !upper.includes(".") // dotted functions like NET.xxx
    ) {
      // Could be a UDF - just warn
      const t = this.tokens[this.pos - 1];
      this.addError(`Unknown function '${name}'. If this is a UDF, ensure it exists.`, t, "UNKNOWN_FUNCTION", "warning");
    }

    this.advance(); // consume (

    // Parse arguments
    if (this.peek().type !== TokenType.RightParen) {
      // Handle special DISTINCT keyword in aggregates
      this.matchKeyword("DISTINCT");
      this.matchKeyword("ALL");

      this.parseExpressionList(tables);

      // Handle special clauses inside function calls
      // e.g. STRING_AGG(x, ',' ORDER BY x)
      // e.g. ARRAY_AGG(x IGNORE NULLS)
      if (this.isKeyword("ORDER")) {
        this.advance();
        this.expectKeyword("BY", "Expected BY after ORDER");
        this.parseOrderByList(tables);
      }
      if (this.isKeyword("IGNORE") || this.isKeyword("RESPECT")) {
        this.advance();
        this.expectKeyword("NULLS", "Expected NULLS");
      }
      if (this.isKeyword("LIMIT")) {
        this.advance();
        this.parseExpression(tables);
      }
      // SEPARATOR for GROUP_CONCAT style
      if (this.isKeyword("SEPARATOR")) {
        this.advance();
        this.parseExpression(tables);
      }
    }

    this.expect(TokenType.RightParen, `Expected ')' to close function ${name}`);

    // OVER clause for window functions
    if (this.isKeyword("OVER")) {
      this.advance();
      this.parseWindowSpec(tables);
    }
  }

  private parseWindowSpec(tables: ResolvedTable[]) {
    if (this.peek().type === TokenType.Identifier && this.peekAt(1).type !== TokenType.LeftParen) {
      // Named window reference
      this.advance();
      return;
    }

    this.expect(TokenType.LeftParen, "Expected '(' after OVER");

    // PARTITION BY
    if (this.isKeyword("PARTITION")) {
      this.advance();
      this.expectKeyword("BY", "Expected BY after PARTITION");
      this.parseExpressionList(tables);
    }

    // ORDER BY
    if (this.isKeyword("ORDER")) {
      this.advance();
      this.expectKeyword("BY", "Expected BY after ORDER");
      this.parseOrderByList(tables);
    }

    // Frame spec: ROWS / RANGE / GROUPS
    if (this.isKeyword("ROWS") || this.isKeyword("RANGE") || this.isKeyword("GROUPS")) {
      this.advance();
      this.parseFrameSpec();
    }

    this.expect(TokenType.RightParen, "Expected ')' to close window specification");
  }

  private parseFrameSpec() {
    if (this.isKeyword("BETWEEN")) {
      this.advance();
      this.parseFrameBound();
      this.expectKeyword("AND", "Expected AND in frame specification");
      this.parseFrameBound();
    } else {
      this.parseFrameBound();
    }
  }

  private parseFrameBound() {
    if (this.isKeyword("UNBOUNDED")) {
      this.advance();
      if (this.isKeyword("PRECEDING") || this.isKeyword("FOLLOWING")) this.advance();
    } else if (this.isKeyword("CURRENT")) {
      this.advance();
      this.matchKeyword("ROW");
    } else {
      this.parseExpression([]);
      if (this.isKeyword("PRECEDING") || this.isKeyword("FOLLOWING")) this.advance();
    }
  }

  // ──── Column Validation ───────────────────────────────────────────────────

  private validateColumnRef(parts: string[], tables: ResolvedTable[]) {
    // Simple heuristic validation
    // If single-part name, check if it exists in any known table
    // If two-part (table.column), check the specific table

    if (parts.length === 1) {
      const colName = parts[0].toUpperCase();
      // Check across all tables from the FROM clause
      let found = false;
      for (const t of tables) {
        if (!t.schemaTable) continue; // subqueries/CTEs don't have column info
        for (const c of t.schemaTable.columns) {
          if (c.name.toUpperCase() === colName) {
            found = true;
            break;
          }
        }
        if (found) break;
      }

      // Only warn if we have schema info and didn't find it
      const hasSchemaInfo = tables.some((t) => t.schemaTable && t.schemaTable.columns.length > 0);
      if (hasSchemaInfo && !found) {
        // Could be an alias, parameter, or CTE column - just warn
        // Only raise this as warning to avoid false positives
        // (we don't track SELECT aliases or CTE columns in detail)
      }
    }

    if (parts.length === 2) {
      const tableRef = parts[0].toUpperCase();
      const colName = parts[1].toUpperCase();

      // Find the matching table by alias
      const table = tables.find((t) => t.alias.toUpperCase() === tableRef);
      if (table && table.schemaTable) {
        const colExists = table.schemaTable.columns.some((c) => c.name.toUpperCase() === colName);
        if (!colExists) {
          const token = this.tokens[this.pos - 1];
          this.addError(
            `Column '${parts[1]}' not found in table '${parts[0]}'. Available columns: ${table.schemaTable.columns.map((c) => c.name).join(", ")}`,
            token,
            "COLUMN_NOT_FOUND"
          );
        }
      }
    }
  }

  // ──── Helper Parsers ──────────────────────────────────────────────────────

  private parseExpressionList(tables: ResolvedTable[]) {
    this.parseExpression(tables);
    while (this.matchComma()) {
      this.parseExpression(tables);
    }
  }

  private parseGroupByList(tables: ResolvedTable[]) {
    // Handles ROLLUP, CUBE, GROUPING SETS
    if (this.isKeyword("ROLLUP") || this.isKeyword("CUBE")) {
      this.advance();
      this.expect(TokenType.LeftParen, "Expected '('");
      this.parseExpressionList(tables);
      this.expect(TokenType.RightParen, "Expected ')'");
      return;
    }
    if (this.isKeyword("GROUPING")) {
      this.advance();
      this.matchKeyword("SETS");
      this.expect(TokenType.LeftParen, "Expected '('");
      this.parseExpressionList(tables);
      this.expect(TokenType.RightParen, "Expected ')'");
      return;
    }

    this.parseExpression(tables);
    while (this.matchComma()) {
      this.parseExpression(tables);
    }
  }

  private parseOrderByList(tables: ResolvedTable[]) {
    this.parseExpression(tables);
    this.matchKeyword("ASC");
    this.matchKeyword("DESC");
    if (this.isKeyword("NULLS")) {
      this.advance();
      if (this.isKeyword("FIRST") || this.isKeyword("LAST")) this.advance();
    }

    while (this.matchComma()) {
      this.parseExpression(tables);
      this.matchKeyword("ASC");
      this.matchKeyword("DESC");
      if (this.isKeyword("NULLS")) {
        this.advance();
        if (this.isKeyword("FIRST") || this.isKeyword("LAST")) this.advance();
      }
    }
  }

  private parseWindowClause() {
    // WINDOW name AS (spec), ...
    do {
      this.parseIdentifier();
      this.expectKeyword("AS", "Expected AS in WINDOW clause");
      this.parseWindowSpec([]);
    } while (this.matchComma());
  }

  private parseIdentifier(): string | null {
    const t = this.peek();
    if (t.type === TokenType.Identifier || t.type === TokenType.Keyword || t.type === TokenType.BacktickIdent) {
      this.advance();
      return t.value;
    }
    return null;
  }

  private parseIdentifierOptional(): string | null {
    const t = this.peek();
    if (
      (t.type === TokenType.Identifier || t.type === TokenType.BacktickIdent) &&
      !this.isSelectTerminator() &&
      !this.isJoinKeyword() &&
      !this.isKeyword("ON") &&
      !this.isKeyword("USING") &&
      !this.isKeyword("WHERE") &&
      !this.isKeyword("SET") &&
      !this.isKeyword("VALUES") &&
      !this.isKeyword("WHEN") &&
      !this.isKeyword("THEN") &&
      !this.isKeyword("MATCHED")
    ) {
      this.advance();
      return t.value;
    }
    return null;
  }

  private parseIdentifierList() {
    this.parseIdentifier();
    while (this.matchComma()) {
      this.parseIdentifier();
    }
  }

  private parseTypeExpression() {
    // Simple type: STRING, INT64, FLOAT64, BOOL, etc.
    // Complex: ARRAY<STRING>, STRUCT<field STRING, ...>
    const t = this.peek();
    if (t.type === TokenType.Identifier || t.type === TokenType.Keyword) {
      this.advance();
      if (this.peek().type === TokenType.LessThan) {
        this.skipTypeSpec();
      }
      // Handle parameterized types like NUMERIC(10, 2)
      if (this.peek().type === TokenType.LeftParen) {
        this.advance();
        while (this.peek().type !== TokenType.RightParen && this.peek().type !== TokenType.EOF) {
          this.advance();
        }
        this.expect(TokenType.RightParen, "Expected ')'");
      }
    }
  }

  private skipTypeSpec() {
    // Skip < ... > including nested generics
    if (this.peek().type !== TokenType.LessThan) return;
    this.advance();
    let depth = 1;
    while (depth > 0 && this.peek().type !== TokenType.EOF) {
      if (this.peek().type === TokenType.LessThan) depth++;
      if (this.peek().type === TokenType.GreaterThan) depth--;
      this.advance();
    }
  }

  private matchComma(): boolean {
    if (this.peek().type === TokenType.Comma) {
      this.advance();
      return true;
    }
    return false;
  }

  // ──── INSERT ──────────────────────────────────────────────────────────────

  private parseInsert() {
    this.advance(); // INSERT
    this.matchKeyword("INTO");

    const tableName = this.parseTableName();
    if (tableName) {
      const table = this.resolveTable(tableName);
      if (!table && !this.cteNames.has(tableName.toUpperCase())) {
        this.addError(`Table '${tableName}' not found in schema`, this.tokens[this.pos - 1], "TABLE_NOT_FOUND");
      }

      // Optional column list
      if (this.peek().type === TokenType.LeftParen) {
        // Check if this is a column list or a VALUES / SELECT subquery
        // Peek ahead to distinguish
        const saved = this.pos;
        this.advance(); // (
        if (this.isKeyword("SELECT") || this.isKeyword("WITH")) {
          this.pos = saved;
        } else {
          // It's a column list - validate columns
          const insertCols: string[] = [];
          const col = this.parseIdentifier();
          if (col) insertCols.push(col);
          while (this.matchComma()) {
            const c = this.parseIdentifier();
            if (c) insertCols.push(c);
          }
          this.expect(TokenType.RightParen, "Expected ')'");

          // Validate columns exist
          if (table) {
            for (const col of insertCols) {
              const exists = table.columns.some((c) => c.name.toUpperCase() === col.toUpperCase());
              if (!exists) {
                this.addError(
                  `Column '${col}' not found in table '${tableName}'. Available: ${table.columns.map((c) => c.name).join(", ")}`,
                  this.tokens[this.pos - 1],
                  "COLUMN_NOT_FOUND"
                );
              }
            }
          }
        }
      }
    }

    // VALUES or SELECT
    if (this.isKeyword("VALUES")) {
      this.advance();
      do {
        this.expect(TokenType.LeftParen, "Expected '(' in VALUES row");
        this.parseExpressionList([]);
        this.expect(TokenType.RightParen, "Expected ')' in VALUES row");
      } while (this.matchComma());
    } else if (this.isKeyword("SELECT") || this.isKeyword("WITH")) {
      if (this.isKeyword("WITH")) {
        this.parseCTE();
      } else {
        this.parseSelect();
      }
    } else if (this.peek().type === TokenType.LeftParen) {
      // Subquery
      this.advance();
      this.parseSelect();
      this.expect(TokenType.RightParen, "Expected ')'");
    }
  }

  // ──── UPDATE ──────────────────────────────────────────────────────────────

  private parseUpdate() {
    this.advance(); // UPDATE
    const tableName = this.parseTableName();
    if (tableName) {
      const table = this.resolveTable(tableName);
      if (!table && !this.cteNames.has(tableName.toUpperCase())) {
        this.addError(`Table '${tableName}' not found in schema`, this.tokens[this.pos - 1], "TABLE_NOT_FOUND");
      }
    }

    // Optional alias
    this.matchKeyword("AS");
    this.parseIdentifierOptional();

    this.expectKeyword("SET", "Expected SET clause in UPDATE statement");

    // SET column = expr, ...
    do {
      this.parseExpression([]);
      this.expect(TokenType.Equals, "Expected '=' in SET clause");
      this.parseExpression([]);
    } while (this.matchComma());

    // FROM (BigQuery supports FROM in UPDATE)
    if (this.isKeyword("FROM")) {
      this.advance();
      this.parseFromClause();
    }

    // WHERE
    if (this.isKeyword("WHERE")) {
      this.advance();
      this.parseExpression([]);
    } else {
      this.addError("UPDATE without WHERE clause will update all rows", this.peek(), "UPDATE_WITHOUT_WHERE", "warning");
    }
  }

  // ──── DELETE ──────────────────────────────────────────────────────────────

  private parseDelete() {
    this.advance(); // DELETE
    this.matchKeyword("FROM");

    const tableName = this.parseTableName();
    if (tableName) {
      const table = this.resolveTable(tableName);
      if (!table && !this.cteNames.has(tableName.toUpperCase())) {
        this.addError(`Table '${tableName}' not found in schema`, this.tokens[this.pos - 1], "TABLE_NOT_FOUND");
      }
    }

    // Optional alias
    this.matchKeyword("AS");
    this.parseIdentifierOptional();

    // WHERE
    if (this.isKeyword("WHERE")) {
      this.advance();
      this.parseExpression([]);
    } else {
      this.addError("DELETE without WHERE clause will delete all rows", this.peek(), "DELETE_WITHOUT_WHERE", "warning");
    }
  }

  // ──── MERGE ───────────────────────────────────────────────────────────────

  private parseMerge() {
    this.advance(); // MERGE
    this.matchKeyword("INTO");

    this.parseTableName(); // target
    this.matchKeyword("AS");
    this.parseIdentifierOptional();

    this.expectKeyword("USING", "Expected USING in MERGE statement");

    // Source: table or subquery
    if (this.peek().type === TokenType.LeftParen) {
      this.advance();
      this.parseSelect();
      this.expect(TokenType.RightParen, "Expected ')'");
    } else {
      this.parseTableName();
    }

    this.matchKeyword("AS");
    this.parseIdentifierOptional();

    this.expectKeyword("ON", "Expected ON in MERGE statement");
    this.parseExpression([]);

    // WHEN MATCHED / NOT MATCHED clauses
    while (this.isKeyword("WHEN")) {
      this.advance();
      this.matchKeyword("NOT");
      this.matchKeyword("MATCHED");
      if (this.isKeyword("BY")) {
        this.advance();
        this.matchKeyword("TARGET");
        this.matchKeyword("SOURCE");
      }
      if (this.isKeyword("AND")) {
        this.advance();
        this.parseExpression([]);
      }
      this.expectKeyword("THEN", "Expected THEN in MERGE clause");

      if (this.isKeyword("UPDATE")) {
        this.advance();
        this.expectKeyword("SET", "Expected SET after UPDATE");
        do {
          this.parseExpression([]);
          this.expect(TokenType.Equals, "Expected '='");
          this.parseExpression([]);
        } while (this.matchComma());
      } else if (this.isKeyword("INSERT")) {
        this.advance();
        if (this.peek().type === TokenType.LeftParen) {
          this.advance();
          this.parseIdentifierList();
          this.expect(TokenType.RightParen, "Expected ')'");
        }
        if (this.isKeyword("ROW")) {
          this.advance();
        } else {
          this.expectKeyword("VALUES", "Expected VALUES in INSERT");
          this.expect(TokenType.LeftParen, "Expected '('");
          this.parseExpressionList([]);
          this.expect(TokenType.RightParen, "Expected ')'");
        }
      } else if (this.isKeyword("DELETE")) {
        this.advance();
      }
    }
  }

  // ──── CREATE ──────────────────────────────────────────────────────────────

  private parseCreate() {
    this.advance(); // CREATE
    this.matchKeyword("OR");
    this.matchKeyword("REPLACE");
    this.matchKeyword("TEMP");
    this.matchKeyword("TEMPORARY");

    if (this.isKeyword("TABLE")) {
      this.statementTypes.push("CREATE TABLE");
      this.skipToStatementEnd();
    } else if (this.isKeyword("VIEW")) {
      this.statementTypes.push("CREATE VIEW");
      this.skipToStatementEnd();
    } else if (this.isKeyword("MATERIALIZED")) {
      this.statementTypes.push("CREATE MATERIALIZED VIEW");
      this.skipToStatementEnd();
    } else if (this.isKeyword("FUNCTION")) {
      this.statementTypes.push("CREATE FUNCTION");
      this.skipToStatementEnd();
    } else if (this.isKeyword("PROCEDURE")) {
      this.statementTypes.push("CREATE PROCEDURE");
      this.skipToStatementEnd();
    } else if (this.isKeyword("SCHEMA") || this.isKeyword("DATABASE")) {
      this.statementTypes.push("CREATE SCHEMA");
      this.skipToStatementEnd();
    } else if (this.isKeyword("EXTERNAL")) {
      this.statementTypes.push("CREATE EXTERNAL TABLE");
      this.skipToStatementEnd();
    } else {
      this.statementTypes.push("CREATE");
      this.skipToStatementEnd();
    }
  }
}

// ─── Internal Types ─────────────────────────────────────────────────────────

interface ResolvedTable {
  alias: string;
  columns: string[];
  schemaTable?: SchemaTable;
}

interface SelectInfo {
  columns: string[];
  fromTables: ResolvedTable[];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate a BigQuery SQL string against a schema.
 *
 * @param schema - The database schema (tables, columns, types)
 * @param sql - The SQL string to validate
 * @returns Validation result with pass/fail and detailed errors
 *
 * @example
 * ```ts
 * const schema: BQSchema = {
 *   defaultProject: "my-project",
 *   defaultDataset: "my_dataset",
 *   tables: [
 *     {
 *       table: "users",
 *       columns: [
 *         { name: "id", type: "INT64" },
 *         { name: "email", type: "STRING" },
 *         { name: "created_at", type: "TIMESTAMP" },
 *       ]
 *     },
 *     {
 *       table: "orders",
 *       columns: [
 *         { name: "id", type: "INT64" },
 *         { name: "user_id", type: "INT64" },
 *         { name: "total", type: "FLOAT64" },
 *         { name: "status", type: "STRING" },
 *       ]
 *     }
 *   ]
 * };
 *
 * const result = validateBQSQL(schema, `
 *   SELECT u.email, SUM(o.total) as total_spent
 *   FROM users u
 *   JOIN orders o ON u.id = o.user_id
 *   WHERE o.status = 'completed'
 *   GROUP BY u.email
 *   ORDER BY total_spent DESC
 *   LIMIT 10
 * `);
 *
 * console.log(result.valid);  // true
 * console.log(result.errors); // []
 * ```
 */
export function validateBQSQL(schema: BQSchema, sql: string): ValidationResult {
  const validator = new SQLValidator(schema);
  return validator.validate(sql);
}

// ─── Convenience: Validate multiple statements ──────────────────────────────

export function validateBQSQLBatch(schema: BQSchema, sql: string): ValidationResult {
  return validateBQSQL(schema, sql);
}

// ─── Default export ─────────────────────────────────────────────────────────

export default validateBQSQL;
