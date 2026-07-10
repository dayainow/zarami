from PIL import Image
import sys

def remove_bg_and_crop(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # Using 240 as threshold to catch off-whites
    for item in datas:
        if item[0] >= 240 and item[1] >= 240 and item[2] >= 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    
    # Crop to bounding box (removes all the empty transparent space)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Saved cropped and transparent image to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python make_transparent_crop.py <input> <output>")
        sys.exit(1)
    remove_bg_and_crop(sys.argv[1], sys.argv[2])
