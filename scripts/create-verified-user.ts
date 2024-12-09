const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function createVerifiedUser() {
    try {
        // First, create and verify the hash
        const password = 'gad6teb4'
        const hash = await bcrypt.hash(password, 10)
        
        // Verify the hash works before proceeding
        const isValid = await bcrypt.compare(password, hash)
        if (!isValid) {
            throw new Error('Hash verification failed')
        }

        console.log('Hash verified successfully')
        console.log('Password:', password)
        console.log('Hash:', hash)

        // Create the user
        const user = {
            name: 'Diogo',
            email: 'diogo@sveletrica.com',
            password: hash,
            permissions: {
                inventory: true,
                sales: true,
                quotations: true,
                clients: true,
                tags: true
            }
        }

        // Insert into database
        const { data, error } = await supabase
            .from('users')
            .insert([user])
            .select()
            .single()

        if (error) throw error

        console.log('User created successfully:', {
            ...data,
            password: '[REDACTED]'
        })

        // Verify login works
        const testValid = await bcrypt.compare(password, hash)
        console.log('Final verification:', testValid)

    } catch (error) {
        console.error('Error:', error)
    }
}

createVerifiedUser() 