from dotenv import load_dotenv
load_dotenv()
import replicate



# rb là read binary, tức mở và đọc file ở dạng nhị phân.
person_image = open("./Image/Person_image/anh2.png","rb")
garment_image1 = open("./Image/Garment_image/vay1.png","rb")
garment_image2 = open("./Image/Garment_image/vay","rb")
if person_image is None :
 print("Person image is empty")
elif garment_image1 or garment_image2 is None:
    print("Garment image is empty")
else : 
    try:
  #output nhận 2 datatype 1 là url 2 là binary data, nếu muốn lấy url hay binary data thì dùng output.url hoặc output.read
     output = replicate.run(
      "prunaai/p-image-try-on",
         input={
    # no_op = No operation, tức là có thực hiện thao tác gen ảnh khoong? Nếu = flase thì thực hiện , = true thì không
           "no_op": False,
        #turbo = tốc độ xử lý ảnh, nếu true thì tôc độ nhanh hơn, nhưng chất lượng giảm.
           "turbo": False,
        #prompt = prompt để gửi cho AI tạo ảnh, không có thì để trống, chỉ để bổ sung thông tin
           "prompt": "",
           "person_image": person_image ,
        #output_format = định dạng đầu ra 
           "output_format": "jpg",
        
           "garment_images": [garment_image1 , garment_image2],
        #output_quality = chất lượng đầu ra tùy theo mỗi định dạng, định dạng jpg chọn quality = 95 thì jpg chất lượng sẽ là 95
           "output_quality": 95,
        #preserve_input_size = giữ nguyên kích thước đầu vào của ảnh, nếu không giữ thì kích thước sẽ được model sử dụng kích thước tùy theo output phù hợp
           "preserve_input_size": True
    }
)
    except Exception as e :
        print("Error" , e)
person_image.close()
garment_image1.close()
garment_image2.close()

print(output.url)
#=> "http://example.com"

# To write the file to disk:
#wb (write binary) là mở file dưới dạng nhị phân, nếu file đã tồn tại thì ghi đè lên còn chưa thì tạo file mới
with open("my-image.png", "wb") as file:
# Output.read : lấy dữ liệu binary từ output sao đó đi vào file bằng file.write
    file.write(output.read())