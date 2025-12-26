
path = r'venv\lib\site-packages\chronos\chronos2\pipeline.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The target string causing syntax error
bad_string = 'lora_config: Union[Union["LoraConfig, dict], None"] = None,'
# Replacement
good_string = 'lora_config: Optional[Union["LoraConfig", dict]] = None,'

if bad_string in content:
    content = content.replace(bad_string, good_string)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed pipeline.py")
else:
    print("String not found in pipeline.py")
