declare const _default: {
    sign(payload: any, option?: any): Promise<string>;
    verify(token: any, option?: {
        ignoreExpiration: boolean;
    }): Promise<any>;
    /**
     *
     * @param {number} sub user account id
     * @returns {string}
     */
    createToken(sub: string): Promise<string>;
    createAuthToken(sub: string, data: any): Promise<string>;
};
export default _default;
