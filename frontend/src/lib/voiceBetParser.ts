/**
 * Voice Bet Parser
 *
 * Parses natural language betting phrases into structured bet data.
 *
 * Supported patterns:
 * - Player props: "Put $20 on LeBron over 25 points at -110"
 * - Moneyline: "Lakers moneyline +150", "$100 on the Celtics"
 * - Spread: "$25 Lakers minus 3.5", "Boston plus 7"
 * - Totals: "$50 over 220", "under 215.5"
 */

export interface ParsedBetData {
  type: 'Prop' | 'Moneyline' | 'Spread' | 'Total' | 'unknown';
  rawTranscript: string;
  confidence: number; // 0-1

  // Common fields
  stake?: number;
  odds?: number;

  // Player prop fields
  playerNameRaw?: string;
  marketType?: string;
  line?: number;
  side?: 'over' | 'under';

  // Team bet fields
  teamNameRaw?: string;
  spreadValue?: number;

  // Parsing issues for user feedback
  issues: string[];
}

// Market type aliases for recognition
const MARKET_ALIASES: Record<string, string> = {
  // NBA/NCAAB
  'points': 'points',
  'point': 'points',
  'pts': 'points',
  'rebounds': 'rebounds',
  'rebound': 'rebounds',
  'boards': 'rebounds',
  'assists': 'assists',
  'assist': 'assists',
  'dimes': 'assists',
  'threes': 'threes',
  'three pointers': 'threes',
  'three-pointers': 'threes',
  '3s': 'threes',
  '3 pointers': 'threes',
  'blocks': 'blocks',
  'block': 'blocks',
  'steals': 'steals',
  'steal': 'steals',

  // NFL/NCAAF
  'passing yards': 'passing_yards',
  'pass yards': 'passing_yards',
  'yards passing': 'passing_yards',
  'passing touchdowns': 'passing_tds',
  'passing tds': 'passing_tds',
  'pass tds': 'passing_tds',
  'rushing yards': 'rushing_yards',
  'rush yards': 'rushing_yards',
  'yards rushing': 'rushing_yards',
  'rushing touchdowns': 'rushing_tds',
  'rushing tds': 'rushing_tds',
  'rush tds': 'rushing_tds',
  'receiving yards': 'receiving_yards',
  'rec yards': 'receiving_yards',
  'yards receiving': 'receiving_yards',
  'receptions': 'receptions',
  'catches': 'receptions',
  'touchdowns': 'touchdowns',
  'tds': 'touchdowns',
  'touchdown': 'anytime_touchdown',
  'anytime td': 'anytime_touchdown',
  'anytime touchdown': 'anytime_touchdown',
  'completions': 'completions',
  'interceptions': 'interceptions',
  'ints': 'interceptions',
};

// Written numbers to numeric
const WRITTEN_NUMBERS: Record<string, number> = {
  'zero': 0,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'eleven': 11,
  'twelve': 12,
  'thirteen': 13,
  'fourteen': 14,
  'fifteen': 15,
  'sixteen': 16,
  'seventeen': 17,
  'eighteen': 18,
  'nineteen': 19,
  'twenty': 20,
  'thirty': 30,
  'forty': 40,
  'fifty': 50,
  'sixty': 60,
  'seventy': 70,
  'eighty': 80,
  'ninety': 90,
  'hundred': 100,
};

/**
 * Parse a number from text, handling written numbers, decimals, etc.
 */
function parseNumber(text: string): number | undefined {
  if (!text) return undefined;

  const cleaned = text.toLowerCase().trim();

  // Direct numeric
  const directMatch = cleaned.match(/^-?\d+\.?\d*$/);
  if (directMatch) {
    return parseFloat(directMatch[0]);
  }

  // Handle "and a half" / "point 5"
  let result = 0;
  let hasValue = false;

  // Check for written numbers
  for (const [word, value] of Object.entries(WRITTEN_NUMBERS)) {
    if (cleaned.includes(word)) {
      result += value;
      hasValue = true;
    }
  }

  // Handle "and a half" or "point five"
  if (cleaned.includes('and a half') || cleaned.includes('half')) {
    result += 0.5;
  }
  if (cleaned.includes('point five') || cleaned.includes('.5')) {
    result += 0.5;
  }

  return hasValue || result > 0 ? result : undefined;
}

/**
 * Parse a stake amount from text
 */
function parseStake(text: string): number | undefined {
  const cleaned = text.toLowerCase();

  // Match patterns like "$20", "20 dollars", "20 bucks", "twenty dollars"
  const patterns = [
    /\$(\d+\.?\d*)/,                           // $20
    /(\d+\.?\d*)\s*(?:dollars?|bucks?)/,       // 20 dollars
    /put\s+(\d+)/,                              // put 20
    /(\d+)\s+on\b/,                            // 20 on
    /for\s+(\d+)/,                             // for 20
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // Try written numbers
  const writtenMatch = cleaned.match(/(?:put\s+)?(twenty|thirty|forty|fifty|hundred|ten|twenty-five|fifty)\s*(?:dollars?|bucks?|on)?/);
  if (writtenMatch) {
    return parseNumber(writtenMatch[1]);
  }

  return undefined;
}

/**
 * Parse odds from text
 */
function parseOdds(text: string): number | undefined {
  const cleaned = text.toLowerCase();

  // Match patterns like "-110", "minus 110", "plus 150", "+150", "at -110"
  const patterns = [
    /(?:at\s+)?([+-]?\d{3})/,                   // -110, +150, at -110
    /(?:at\s+)?minus\s*(\d{2,3})/,              // minus 110
    /(?:at\s+)?plus\s*(\d{2,3})/,               // plus 150
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      // Check if it's a minus pattern
      if (cleaned.includes('minus') && num > 0) {
        return -num;
      }
      return num;
    }
  }

  // "even" or "even money"
  if (cleaned.includes('even')) {
    return 100;
  }

  return undefined;
}

/**
 * Parse player prop bet
 */
function parsePlayerProp(text: string): Partial<ParsedBetData> {
  const result: Partial<ParsedBetData> = {
    type: 'Prop',
    issues: [],
  };

  const cleaned = text.toLowerCase();

  // Extract side (over/under)
  if (cleaned.includes('over')) {
    result.side = 'over';
  } else if (cleaned.includes('under')) {
    result.side = 'under';
  }

  // Extract market type
  for (const [alias, marketType] of Object.entries(MARKET_ALIASES)) {
    if (cleaned.includes(alias)) {
      result.marketType = marketType;
      break;
    }
  }

  // Extract line (number before or after market type)
  // Pattern: "over 25.5 points" or "25.5 points over" or "over 25 points"
  const linePatterns = [
    /(?:over|under)\s+(\d+\.?\d*)/,            // over 25.5
    /(\d+\.?\d*)\s+(?:points|rebounds|assists|threes|blocks|steals|yards|tds|touchdowns|receptions)/,  // 25.5 points
  ];

  for (const pattern of linePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      result.line = parseFloat(match[1]);
      break;
    }
  }

  // Extract player name - this is tricky
  // Common patterns:
  // - "on LeBron over 25"
  // - "LeBron James over 25"
  // - "put $20 on curry over"

  // Try to find name between "on" and "over/under"
  let nameMatch = cleaned.match(/(?:on\s+)([a-z]+(?:\s+[a-z]+)?)\s+(?:over|under)/);
  if (nameMatch) {
    result.playerNameRaw = nameMatch[1].trim();
  } else {
    // Try to find capitalized words at start (before numbers)
    const words = text.split(/\s+/);
    const nameWords: string[] = [];
    let foundNumber = false;

    for (const word of words) {
      // Skip common words
      if (['put', 'on', 'the', 'at', 'for', '$', 'dollars', 'bucks'].some(skip =>
        word.toLowerCase().includes(skip) || /^\$?\d/.test(word)
      )) {
        if (/^\d/.test(word)) foundNumber = true;
        continue;
      }

      // If we hit over/under, stop
      if (word.toLowerCase() === 'over' || word.toLowerCase() === 'under') {
        break;
      }

      // Add capitalized words or lowercase words before we hit numbers
      if (!foundNumber && word.length > 1) {
        nameWords.push(word);
      }
    }

    if (nameWords.length > 0) {
      result.playerNameRaw = nameWords.join(' ').replace(/[^a-zA-Z\s]/g, '').trim();
    }
  }

  // Validation
  if (!result.playerNameRaw) {
    result.issues!.push('Could not identify player name');
  }
  if (!result.marketType) {
    // Default to points if not specified
    result.marketType = 'points';
    result.issues!.push('Market type not specified, assuming points');
  }
  if (result.line === undefined) {
    result.issues!.push('Could not identify line');
  }
  if (!result.side) {
    result.issues!.push('Could not identify over/under');
  }

  return result;
}

/**
 * Parse moneyline bet
 */
function parseMoneyline(text: string): Partial<ParsedBetData> {
  const result: Partial<ParsedBetData> = {
    type: 'Moneyline',
    issues: [],
  };

  const cleaned = text.toLowerCase();

  // Extract team name
  // Patterns: "lakers moneyline", "on the celtics", "boston ml"
  const teamPatterns = [
    /(?:on\s+(?:the\s+)?)?([a-z]+(?:\s+[a-z]+)?)\s*(?:moneyline|ml|money\s*line)/i,
    /(?:on\s+(?:the\s+)?)([a-z]+(?:\s+[a-z]+)?)(?:\s+at\s+[+-]?\d+)?$/i,
  ];

  for (const pattern of teamPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.teamNameRaw = match[1].trim();
      break;
    }
  }

  // Try extracting team from simpler patterns
  if (!result.teamNameRaw) {
    // Remove stake, odds, and common words
    let simplified = cleaned
      .replace(/\$\d+/g, '')
      .replace(/\d+\s*(?:dollars?|bucks?)/g, '')
      .replace(/(?:at\s+)?[+-]?\d{3}/g, '')
      .replace(/moneyline|ml|money\s*line/g, '')
      .replace(/put|on|the|at|for/g, '')
      .trim();

    if (simplified.length > 0) {
      result.teamNameRaw = simplified.split(/\s+/).slice(0, 2).join(' ');
    }
  }

  if (!result.teamNameRaw) {
    result.issues!.push('Could not identify team');
  }

  return result;
}

/**
 * Parse spread bet
 */
function parseSpread(text: string): Partial<ParsedBetData> {
  const result: Partial<ParsedBetData> = {
    type: 'Spread',
    issues: [],
  };

  const cleaned = text.toLowerCase();

  // Extract spread value
  // Patterns: "minus 3.5", "plus 7", "-3.5", "+7"
  const spreadPatterns = [
    /(?:minus|negative)\s*(\d+\.?\d*)/,        // minus 3.5
    /(?:plus|positive)\s*(\d+\.?\d*)/,         // plus 7
    /([+-]\d+\.?\d*)/,                          // -3.5, +7
  ];

  for (const pattern of spreadPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let value = parseFloat(match[1]);
      if (cleaned.includes('minus') || cleaned.includes('negative') || match[0].startsWith('-')) {
        value = -Math.abs(value);
      } else {
        value = Math.abs(value);
      }
      result.spreadValue = value;
      break;
    }
  }

  // Extract team name (words before minus/plus)
  const teamMatch = text.match(/(?:on\s+(?:the\s+)?)?([a-z]+(?:\s+[a-z]+)?)\s+(?:minus|plus|negative|positive|[+-]\d)/i);
  if (teamMatch) {
    result.teamNameRaw = teamMatch[1].trim();
  }

  if (!result.teamNameRaw) {
    result.issues!.push('Could not identify team');
  }
  if (result.spreadValue === undefined) {
    result.issues!.push('Could not identify spread');
  }

  return result;
}

/**
 * Parse total bet
 */
function parseTotal(text: string): Partial<ParsedBetData> {
  const result: Partial<ParsedBetData> = {
    type: 'Total',
    issues: [],
  };

  const cleaned = text.toLowerCase();

  // Extract side
  if (cleaned.includes('over')) {
    result.side = 'over';
  } else if (cleaned.includes('under')) {
    result.side = 'under';
  }

  // Extract line
  const lineMatch = cleaned.match(/(?:over|under)\s+(\d+\.?\d*)/);
  if (lineMatch) {
    result.line = parseFloat(lineMatch[1]);
  } else {
    // Try finding a large number (typically totals are 150+)
    const numbers = cleaned.match(/\d+\.?\d*/g);
    if (numbers) {
      for (const num of numbers) {
        const value = parseFloat(num);
        if (value > 50 && value < 350) {  // Reasonable total range
          result.line = value;
          break;
        }
      }
    }
  }

  if (!result.side) {
    result.issues!.push('Could not identify over/under');
  }
  if (result.line === undefined) {
    result.issues!.push('Could not identify total line');
  }

  return result;
}

/**
 * Determine bet type from transcript
 */
function detectBetType(text: string): 'Prop' | 'Moneyline' | 'Spread' | 'Total' | 'unknown' {
  const cleaned = text.toLowerCase();

  // Check for explicit type indicators
  if (cleaned.includes('moneyline') || cleaned.includes('ml') || cleaned.includes('money line')) {
    return 'Moneyline';
  }

  // Check for spread indicators (minus/plus with a team)
  if ((cleaned.includes('minus') || cleaned.includes('plus')) &&
      !cleaned.includes('over') && !cleaned.includes('under')) {
    // Make sure it's not odds (3 digit numbers)
    if (/(?:minus|plus)\s+\d{1,2}(?:\.\d)?(?!\d)/.test(cleaned)) {
      return 'Spread';
    }
  }

  // Check for total indicators (over/under with high number, no player context)
  const hasOverUnder = cleaned.includes('over') || cleaned.includes('under');
  if (hasOverUnder) {
    // Check for market types (indicates player prop)
    for (const alias of Object.keys(MARKET_ALIASES)) {
      if (cleaned.includes(alias)) {
        return 'Prop';
      }
    }

    // Check for high numbers (totals are usually 150+)
    const numbers = cleaned.match(/\d+\.?\d*/g);
    if (numbers) {
      for (const num of numbers) {
        const value = parseFloat(num);
        if (value > 100 && value < 350) {
          return 'Total';
        }
      }
    }

    // If has over/under but not high number, likely a prop
    return 'Prop';
  }

  // Default to moneyline if just team name
  return 'unknown';
}

/**
 * Main parser function
 */
export function parseVoiceBet(transcript: string): ParsedBetData {
  const result: ParsedBetData = {
    type: 'unknown',
    rawTranscript: transcript,
    confidence: 0,
    issues: [],
  };

  if (!transcript || transcript.trim().length < 3) {
    result.issues.push('No speech detected');
    return result;
  }

  // Extract common fields
  result.stake = parseStake(transcript);
  result.odds = parseOdds(transcript);

  // Detect and parse bet type
  const betType = detectBetType(transcript);
  result.type = betType;

  let typeResult: Partial<ParsedBetData> = {};

  switch (betType) {
    case 'Prop':
      typeResult = parsePlayerProp(transcript);
      break;
    case 'Moneyline':
      typeResult = parseMoneyline(transcript);
      break;
    case 'Spread':
      typeResult = parseSpread(transcript);
      break;
    case 'Total':
      typeResult = parseTotal(transcript);
      break;
    default:
      result.issues.push('Could not determine bet type');
  }

  // Merge results
  Object.assign(result, typeResult);
  result.issues = [...result.issues, ...(typeResult.issues || [])];

  // Calculate confidence
  let confidence = 1.0;
  if (result.issues.length > 0) {
    confidence -= 0.2 * result.issues.length;
  }
  if (!result.stake) confidence -= 0.1;
  if (!result.odds) confidence -= 0.05;  // Odds can default to -110
  result.confidence = Math.max(0, Math.min(1, confidence));

  // Default odds if not specified
  if (!result.odds && result.type !== 'unknown') {
    result.odds = -110;
    result.issues.push('Odds not specified, defaulting to -110');
  }

  return result;
}

/**
 * Build selection string from parsed bet
 */
export function buildSelectionString(parsed: ParsedBetData): string {
  switch (parsed.type) {
    case 'Prop':
      return `${parsed.playerNameRaw || 'Unknown'} ${parsed.side === 'over' ? 'Over' : 'Under'} ${parsed.line || '?'} ${parsed.marketType || 'Points'}`;
    case 'Moneyline':
      return `${parsed.teamNameRaw || 'Unknown'}`;
    case 'Spread':
      return `${parsed.teamNameRaw || 'Unknown'} ${parsed.spreadValue && parsed.spreadValue > 0 ? '+' : ''}${parsed.spreadValue || '?'}`;
    case 'Total':
      return `${parsed.side === 'over' ? 'Over' : 'Under'} ${parsed.line || '?'}`;
    default:
      return parsed.rawTranscript;
  }
}

/**
 * Calculate potential payout from stake and odds
 */
export function calculatePayout(stake: number, odds: number): number {
  if (odds > 0) {
    return stake + stake * (odds / 100);
  } else {
    return stake + stake * (100 / Math.abs(odds));
  }
}
