import { Strategy } from 'passport-jwt';
import type { User } from './interfaces/user.interface';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithoutRequest] | [opt: import("passport-jwt").StrategyOptionsWithRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: {
        sub: number;
        email: string;
    }): Omit<User, 'password'>;
}
export {};
