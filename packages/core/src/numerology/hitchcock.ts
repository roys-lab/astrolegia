/**
 * MOTOR CANÓNICO DE NUMEROLOGÍA DE ASTROLEGIA
 *
 * Método: Helyn Hitchcock — "Numerología, portal del destino"
 * (fuente: Conocimiento/hitchcock_extracted.txt).
 *
 * Reglas clave tomadas del libro:
 *
 * 1. CADA nombre se calcula POR SEPARADO (reducido) y luego se suman los
 *    reducidos: "Sumamos cada nombre por separado antes de [llegar] a un
 *    total de todos los nombres porque cada nombre tiene un efecto definido
 *    sobre cómo se llevará a cabo el destino. [...] podemos perder un once
 *    o un veintidós" (p. 48, ejemplo John Fitzgerald Kennedy).
 *
 * 2. Números maestros: 11, 22 y 33. El 44 NO es maestro en Hitchcock.
 *
 * 3. La Y — el libro (p. 30) dice: "Las vocales son: A, E, I, O, U, y a
 *    veces Y. Y es una vocal cuando no [hay] otra vocal en la sílaba.
 *    Ejemplo: En el nombre WYNN, la 'Y' es la [vocal]". En el ejemplo
 *    resuelto de KENNEDY (p. 48) el libro computa la Y como CONSONANTE
 *    (consonantes K+N+N+D+Y = 23 -> 5; vocales E+E = 10 -> 1), es decir:
 *    en la práctica del libro la Y solo es vocal cuando el nombre no
 *    contiene ninguna otra vocal. Implementamos exactamente eso, a nivel
 *    de palabra: Y es vocal si la palabra no tiene A/E/I/O/U (WYNN, LYNN)
 *    y consonante si la tiene (KENNEDY, MARY).
 *
 * 4. La W — el libro (p. 30): "'W' nunca es vocal de primera letra. Sólo se
 *    usa en combinación con otra vocal y sigue a la otra [...] No uso W como
 *    vocal puesto que su uso es muy limitado". Por lo tanto: W SIEMPRE
 *    consonante.
 *
 * 5. La Ñ — el libro (escrito en inglés) no la trata. Práctica estándar de
 *    la numerología pitagórica en español: Ñ = 5, igual que la N. Los
 *    acentos se pliegan (á -> a, ü -> u) antes de mapear las letras.
 */
export class NumerologyHitchcock {
    private static readonly LETTER_VALUES: Record<string, number> = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
        'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8,
        'Ñ': 5 // No figura en el libro (inglés); práctica estándar en español: como la N
    };

    private static readonly VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

    /**
     * Reducción canónica: reduce a un dígito, preservando los números
     * maestros 11, 22 y 33 en CADA iteración (29 -> 11 queda 11).
     * El 44 no es maestro en Hitchcock: 44 -> 8.
     * Única fuente de verdad de la reducción en toda la app.
     */
    static reduce(num: number): number {
        if (num === 11 || num === 22 || num === 33) return num;
        if (num < 10) return num;

        let sum = 0;
        const digits = num.toString().split('');
        for (const digit of digits) {
            sum += parseInt(digit, 10);
        }
        return this.reduce(sum);
    }

    /**
     * Reduces a number ALWAYS to a single digit (0-9), collapsing
     * Master Numbers too (11 -> 2, 22 -> 4, 33 -> 6). Used where a
     * single-digit component is required, e.g. challenge subtractions.
     */
    private static reduceHard(num: number): number {
        let n = this.reduce(num);
        if (n === 11) n = 2;
        if (n === 22) n = 4;
        if (n === 33) n = 6;
        return n;
    }

    /**
     * Normaliza un nombre completo y lo devuelve como palabras separadas:
     * mayúsculas, acentos plegados (á -> A), Ñ preservada (vale 5) y todo
     * carácter no alfabético descartado. Devuelve palabras porque el método
     * Hitchcock reduce cada nombre por separado y la regla de la Y opera
     * dentro de cada palabra.
     */
    static getNameParts(fullName: string): string[] {
        return fullName
            .toUpperCase()
            .replace(/Ñ/g, '__NN__')
            .normalize('NFD')
            .replace(/\p{M}/gu, '') // quita diacríticos (á -> A) tras NFD
            .replace(/__NN__/g, 'Ñ')
            .split(/\s+/)
            .map(part => part.replace(/[^A-ZÑ]/g, ''))
            .filter(part => part.length > 0);
    }

    /** Valor pitagórico de una letra (ya normalizada o no). 0 si no mapea. */
    static getLetterValue(char: string): number {
        return this.LETTER_VALUES[char.toUpperCase()] || 0;
    }

    /**
     * Clasifica una letra como vocal dentro de una palabra (normalizada).
     * - A, E, I, O, U: siempre vocales.
     * - Y: vocal SOLO si la palabra no contiene otra vocal (regla del libro,
     *   p. 30 "WYNN" + ejemplo KENNEDY p. 48 donde la Y es consonante).
     * - W: siempre consonante ("No uso W como vocal", p. 30).
     */
    static isVowelLetter(char: string, word: string): boolean {
        const c = char.toUpperCase();
        if (this.VOWELS.has(c)) return true;
        if (c === 'Y') {
            for (const other of word.toUpperCase()) {
                if (this.VOWELS.has(other)) return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Suma los valores de las letras de UNA palabra normalizada.
     * @param word Palabra ya normalizada (salida de getNameParts).
     * @param filter 'all' | 'vowels' | 'consonants'
     */
    private static calculateStringValue(word: string, filter: 'all' | 'vowels' | 'consonants' = 'all'): number {
        let sum = 0;

        for (const char of word) {
            const value = this.LETTER_VALUES[char] || 0;
            const isVowel = this.isVowelLetter(char, word);

            if (filter === 'all') {
                sum += value;
            } else if (filter === 'vowels' && isVowel) {
                sum += value;
            } else if (filter === 'consonants' && !isVowel) {
                sum += value;
            }
        }

        return sum; // Returns raw sum, not reduced yet
    }

    /**
     * Sentiero Natal (Life Path): Sum of Month + Day + Year (each reduced,
     * then the total reduced).
     * Book example (Rockefeller): July 8, 1839.
     * Month: July (7), Day: 8, Year: 1839 -> 1+8+3+9 = 21 -> 3.
     * Total: 7 + 8 + 3 = 18 -> 9.
     */
    static calculateLifePath(birthDate: Date): number {
        const day = birthDate.getUTCDate();
        const month = birthDate.getUTCMonth() + 1; // 0-indexed
        const year = birthDate.getUTCFullYear();

        const rDay = this.reduce(day);
        const rMonth = this.reduce(month);
        const rYear = this.reduce(this.reduce(year));

        const total = rDay + rMonth + rYear;
        return this.reduce(total);
    }

    /**
     * Ambición Secreta / Impulso del Alma (Soul Urge): vocales de CADA
     * nombre reducidas por separado y luego sumadas.
     * Ejemplo del libro (p. 32): Ella (6) + Fitzgerald (15 -> 6) = 12 -> 3.
     * Ejemplo JFK (p. 48): John (6) + Fitzgerald (6) + Kennedy (1) = 13 -> 4.
     */
    static calculateSoulUrge(fullName: string): number {
        let totalScore = 0;
        for (const part of this.getNameParts(fullName)) {
            totalScore += this.reduce(this.calculateStringValue(part, 'vowels'));
        }
        return this.reduce(totalScore);
    }

    /**
     * Personalidad (Personality): consonantes de CADA nombre reducidas por
     * separado y luego sumadas.
     * Ejemplo JFK (p. 48): John (14 -> 5) + Fitzgerald (39 -> 3) +
     * Kennedy (23 -> 5) = 13 -> 4.
     */
    static calculatePersonality(fullName: string): number {
        let totalScore = 0;
        for (const part of this.getNameParts(fullName)) {
            totalScore += this.reduce(this.calculateStringValue(part, 'consonants'));
        }
        return this.reduce(totalScore);
    }

    /**
     * Destino / Expresión: para CADA nombre, vocales reducidas + consonantes
     * reducidas (preservando maestros), luego se suman los destinos de cada
     * nombre y se reduce el total.
     * Ejemplo JFK (p. 48): John 6+5 = 11 (maestro, se preserva),
     * Fitzgerald 6+3 = 9, Kennedy 1+5 = 6; total 11+9+6 = 26 -> 8.
     * "Nunca sumamos las vocales y consonantes [en conjunto] para [llegar a]
     * un número del destino; pues como lo demuestra el caso de J.F.K.
     * podemos perder un once o un veintidós" (p. 48).
     */
    static calculateDestiny(fullName: string): number {
        let totalScore = 0;
        for (const part of this.getNameParts(fullName)) {
            const vowels = this.reduce(this.calculateStringValue(part, 'vowels'));
            const consonants = this.reduce(this.calculateStringValue(part, 'consonants'));
            totalScore += this.reduce(vowels + consonants);
        }
        return this.reduce(totalScore);
    }

    /**
     * Karma (Missing Numbers): Array of numbers 1-9 that are NOT present in the full name.
     */
    static calculateKarma(fullName: string): number[] {
        const presentNumbers = new Set<number>();

        for (const part of this.getNameParts(fullName)) {
            for (const char of part) {
                const val = this.LETTER_VALUES[char] || 0;
                if (val > 0) presentNumbers.add(val);
            }
        }

        const missing: number[] = [];
        for (let i = 1; i <= 9; i++) {
            if (!presentNumbers.has(i)) {
                missing.push(i);
            }
        }
        return missing;
    }

    /**
     * Desafíos (Challenges): Based on birth date.
     * 1st: |Month - Day|
     * 2nd: |Day - Year|
     * 3rd: |1st - 2nd|
     * 4th: |Month - Year|
     * Note: Calculations use single-digit components (Master Numbers are
     * collapsed via reduceHard, otherwise a day 22 or 29 yields challenges > 9).
     */
    static calculateChallenges(birthDate: Date): number[] {
        const day = this.reduceHard(birthDate.getUTCDate());
        const month = this.reduceHard(birthDate.getUTCMonth() + 1);
        const year = this.reduceHard(birthDate.getUTCFullYear()); // Reduced year

        const c1 = Math.abs(month - day);
        const c2 = Math.abs(day - year);
        const c3 = Math.abs(c1 - c2);
        const c4 = Math.abs(month - year);

        return [c1, c2, c3, c4];
    }

    /**
     * Pináculos (Pinnacles): Based on birth date.
     * 1st: Month + Day
     * 2nd: Day + Year
     * 3rd: 1st + 2nd
     * 4th: Month + Year
     */
    static calculatePinnacles(birthDate: Date): number[] {
        const day = this.reduce(birthDate.getUTCDate());
        const month = this.reduce(birthDate.getUTCMonth() + 1);
        const year = this.reduce(this.reduce(birthDate.getUTCFullYear()));

        const p1 = this.reduce(month + day);
        const p2 = this.reduce(day + year);
        const p3 = this.reduce(p1 + p2);
        const p4 = this.reduce(month + year);

        return [p1, p2, p3, p4];
    }

    /**
     * Ciclos de Pináculos con Edades (Pinnacle Periods)
     * 1st Period: 0 to (36 - Life Path Number)
     * 2nd Period: +9 years
     * 3rd Period: +9 years
     * 4th Period: Until end of life
     */
    static calculatePinnaclePeriods(birthDate: Date): { value: number, startAge: number, endAge: number | null }[] {
        const pinnacles = this.calculatePinnacles(birthDate);
        const lifePath = this.calculateLifePath(birthDate);

        // For the 36-X calculation Master Numbers are collapsed to a single
        // digit (Life Path 11 -> 36 - 2 = 34), per standard Hitchcock practice.
        const reducedLifePath = this.reduceHard(lifePath);

        const end1 = 36 - reducedLifePath;
        const end2 = end1 + 9;
        const end3 = end2 + 9;

        return [
            { value: pinnacles[0], startAge: 0, endAge: end1 },
            { value: pinnacles[1], startAge: end1 + 1, endAge: end2 },
            { value: pinnacles[2], startAge: end2 + 1, endAge: end3 },
            { value: pinnacles[3], startAge: end3 + 1, endAge: null } // null means "onwards"
        ];
    }

    /**
     * Año Personal (Personal Year): Based on birth day/month + CURRENT year.
     * Formula: Day + Month + Current Year (reduced).
     */
    static calculatePersonalYear(birthDate: Date, targetDate: Date = new Date()): number {
        const day = this.reduce(birthDate.getUTCDate());
        const month = this.reduce(birthDate.getUTCMonth() + 1);
        const currentYear = this.reduce(targetDate.getUTCFullYear());

        return this.reduce(day + month + currentYear);
    }
}
