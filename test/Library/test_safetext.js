const SafeText = artifacts.require('../SafeText');

contract('SafeText', () => {

    beforeEach(async () => {
      instance = await SafeText.new();
    })
    
    it('returns true for supported characters', async () => {
        let charArray = ("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWAXYZ").split('');
        for(i=0; i<charArray.length; i++){
            var isSafe = await instance.isSafeString(charArray[i]);
            assert.isTrue(isSafe);
        }
    });

    it('returns false for unsupported characters', async () => {
        let charArray = ("~!@#$%^&*()_+-=[]{}\\|:;\",<>?/`'").split('');
        for(i=0; i<charArray.length; i++){
            var isSafe = await instance.isSafeString(charArray[i]);
            assert.isFalse(isSafe);
        }
    });
});