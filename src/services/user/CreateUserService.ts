class CreateUserService {
    async execute(name: string, email: string, password: string) {
        return {name, email, password};
    }
}

export { CreateUserService };