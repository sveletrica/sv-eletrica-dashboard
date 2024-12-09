import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const SUPABASE_URL = 'your-supabase-url'
const SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function createAdminUser() {
    try {
        const adminUser = {
            name: 'Admin',
            email: 'admin@sveletrica.com',
            password: await bcrypt.hash('your-password', 10),
            permissions: {
                inventory: true,
                sales: true,
                quotations: true,
                clients: true,
                tags: true
            }
        }

        const { data, error } = await supabase
            .from('users')
            .insert([adminUser])
            .select()
            .single()

        if (error) throw error

        console.log('Admin user created successfully:', {
            ...data,
            password: '[REDACTED]'
        })
    } catch (error) {
        console.error('Error creating admin user:', error)
    }
}

createAdminUser() 