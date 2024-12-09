import bcrypt from 'bcryptjs'

async function generateHash() {
    const password = 'gad6teb4'
    const hash = await bcrypt.hash(password, 10)
    console.log('Password:', password)
    console.log('Generated hash:', hash)
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash)
    console.log('Hash verification:', isValid)
}

generateHash() 