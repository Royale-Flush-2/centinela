import requests

url = "https://7pfqgcwyrm.us-east-2.awsapprunner.com/api/v1/knowledge/search"
payload = {
    "query": "descuentos permitidos",
    "namespace": "default",
    "top_k": 3
}

try:
    response = requests.post(url, json=payload, timeout=30)
    print(response.status_code)
    print(response.json())
except Exception as e:
    print(e)
