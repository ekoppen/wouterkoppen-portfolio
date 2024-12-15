const bcrypt = require('bcryptjs');

async function testBcrypt() {
    const password = 'admin123';
    
    // Test 1: Direct hash en verify
    console.log('Test 1: Direct hash en verify');
    const hash1 = await bcrypt.hash(password, 10);
    console.log('Hash 1:', hash1);
    const isValid1 = await bcrypt.compare(password, hash1);
    console.log('Is valid 1:', isValid1);
    
    // Test 2: Met expliciete salt
    console.log('\nTest 2: Met expliciete salt');
    const salt = await bcrypt.genSalt(10);
    console.log('Salt:', salt);
    const hash2 = await bcrypt.hash(password, salt);
    console.log('Hash 2:', hash2);
    const isValid2 = await bcrypt.compare(password, hash2);
    console.log('Is valid 2:', isValid2);
    
    // Test 3: Vergelijk met bekende hash
    console.log('\nTest 3: Vergelijk met bekende hash');
    const knownHash = '$2a$10$V1FJ4LRGF42xKH4kn5p3c.al5uRdV4Kw8sMwlCEFbrBJPdnFwEXAS';
    const isValid3 = await bcrypt.compare(password, knownHash);
    console.log('Is valid 3:', isValid3);
}

testBcrypt().catch(console.error); 