export interface User {
    userId: number;
    email: string;
    password: string;
    name?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
