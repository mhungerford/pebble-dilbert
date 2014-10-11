import xmlrpclib
import base64

remoteMagick = xmlrpclib.Server("http://localhost:8042")

f=open("dilbert_coffee.gif",'r')
encoded_file=base64.b64encode(f.read())
f.close()

resized_encoded = remoteMagick.crop_and_resize(encoded_file,179,174,0,0,144,168)
f=open("test_resized.png","w")
f.write(base64.b64decode(resized_encoded))
f.close()

#resized_encoded = remoteMagick.resize("http://walgran.com/justin/media/dr-seuss-wtf-is-this-shit.jpg",100,100)
#f=open("test_resized_from_url.jpg","w")
#f.write(base64.b64decode(resized_encoded))
#f.close()


