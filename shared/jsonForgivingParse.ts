/**
 * Attempts to parse a JSON string in a forgiving manner by first attempting to repair malformed JSON.
 * This function combines jsonrepair and json-parse-even-better-errors libraries to handle common JSON parsing issues
 * such as trailing commas, missing quotes, and other syntax errors.
 * 
 * @param json - The JSON string to parse
 * @returns The parsed JSON object
 * @throws {SyntaxError} If the JSON is so malformed that it cannot be repaired or parsed
 * 
 * @example
 * ```typescript
 * const malformedJson = '{ "name": "test", }'; // note the trailing comma
 * const result = jsonForgivingParse(malformedJson);
 * // result = { name: "test" }
 * ```
 */
import parseJsonError from 'json-parse-even-better-errors';
import { jsonrepair } from 'jsonrepair';


/**
 * Forgiving JSON parser
 */
const jsonForgivingParse = (raw: string) => {
    try {
        return JSON.parse(raw);
    } catch (error) {
        try {
            const repaired = jsonrepair(raw);
            const parsed = JSON.parse(repaired);
            parsed[Symbol.for('repaired')] = true;
            return parsed;
        } catch (error) {
            throw new parseJsonError.JSONParseError(error, raw, 20, jsonForgivingParse);
        }
    }
}

export default jsonForgivingParse;
