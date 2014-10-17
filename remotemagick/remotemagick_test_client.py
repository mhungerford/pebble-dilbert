import xmlrpclib
import base64

remoteMagick = xmlrpclib.Server("http://localhost:8042")

f=open("dilbert_coffee.gif",'r')
encoded_file=base64.b64encode(f.read())
f.close()

#resized_encoded = remoteMagick.crop_and_resize(encoded_file,179,174,0,0,144,168)
#resized_encoded = remoteMagick.crop_and_resize(encoded_file,179,174,192,0,144,168)
#resized_encoded = remoteMagick.crop_and_resize(encoded_file,172,166,386,4,144,168)
#f=open("test_resized.png","w")
#f.write(base64.b64decode(resized_encoded))
#f.close()

resized_encoded = remoteMagick.crop_and_resize("http://dilbert.com/dyn/str_strip/000000000/00000000/0000000/200000/00000/4000/700/204789/204789.strip.gif",172,166,386,4,144,168)
f=open("test_resized_from_url.png","w")
f.write(base64.b64decode(resized_encoded))
f.close()


