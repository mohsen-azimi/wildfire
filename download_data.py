import os
import zipfile
import requests
from tqdm import tqdm

# Define the directory and the URL for downloading the file
dataDIR = r"C:\Users\Mohsen\Desktop\data\wildfire\landcover_CA_forest_VLCE2_2022"
zip_file_url = "https://opendata.nfis.org/downloads/forest_change/CA_forest_VLCE2_2022.zip"
zip_file_path = r"C:\Users\Mohsen\Desktop\data\wildfire\CA_forest_VLCE2_2022.zip"

# Check if the directory exists
if not os.path.exists(dataDIR):
    print(f"Directory {dataDIR} does not exist. Downloading and unzipping the data...")

    # Send a request to the URL
    response = requests.get(zip_file_url, stream=True)

    # Get the total size of the file
    total_size = int(response.headers.get('Content-Length', 0))

    # Open the file to write the data to
    with open(zip_file_path, 'wb') as f:
        # Create a progress bar
        with tqdm(total=total_size, unit='B', unit_scale=True, desc="Downloading") as pbar:
            # Download in chunks
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
                    pbar.update(len(chunk))
    print("Download complete.")

    # Unzip the file
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(os.path.dirname(dataDIR))
    print("Unzipping complete.")

    # Remove the zip file after extracting
    os.remove(zip_file_path)
    print("Zip file removed.")
else:
    print(f"Directory {dataDIR} already exists.")
