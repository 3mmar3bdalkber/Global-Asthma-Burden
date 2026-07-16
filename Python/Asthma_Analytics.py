import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split

# 1. Page Configuration
st.set_page_config(page_title="Asthma Insights Dashboard", layout="wide", initial_sidebar_state="expanded")

st.title("🫁 Asthma Insights & Analytics Dashboard")
st.markdown("Interactive dashboard for exploring global asthma data and clinical patient records.")

# -----------------------------------------------------------------------------
# 2. Data Loading & Simple Cleaning
# -----------------------------------------------------------------------------
@st.cache_data
def load_and_clean_global_data():
    df = pd.read_csv("GBD_Asthma_Final.csv",encoding='latin1')
    df.columns = df.columns.str.strip()
    df = df.drop_duplicates()
    for col in df.columns:
        if df[col].isnull().any():
            if df[col].dtype in ['float64', 'int64']:
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else 'Unknown')
    return df

@st.cache_data
def load_and_clean_patient_data():
    df = pd.read_csv("asthma_disease_data_realistic.csv",encoding='latin1')
    df = df.drop_duplicates()
    for col in df.columns:
        if df[col].isnull().any():
            if df[col].dtype in ['float64', 'int64']:
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else 'Unknown')
    
    gender_map = {0: "Male", 1: "Female"}
    binary_map = {0: "No", 1: "Yes"}
    ethnicity_map = {0: "Caucasian", 1: "African American", 2: "Asian", 3: "Other"}
    education_map = {0: "None", 1: "High School", 2: "Bachelor's", 3: "Higher"}
    diagnosis_map = {0: 'Healthy', 1: 'Asthma'}
    
    df['Gender_Label'] = df['Gender'].apply(lambda x: gender_map.get(x, str(x)))
    df['Smoking_Label'] = df['Smoking'].apply(lambda x: binary_map.get(x, str(x)))
    df['Diagnosis_Label'] = df['Diagnosis'].apply(lambda x: diagnosis_map.get(x, str(x)))
    df['Ethnicity_Label'] = df['Ethnicity'].apply(lambda x: ethnicity_map.get(x, str(x)))
    df['EducationLevel_Label'] = df['EducationLevel'].apply(lambda x: education_map.get(x, str(x)))
    
    symptom_cols = ['Wheezing', 'ShortnessOfBreath', 'ChestTightness', 'Coughing', 'NighttimeSymptoms', 'ExerciseInduced']
    for col in symptom_cols:
        if col in df.columns:
            df[f'{col}_Label'] = df[col].apply(lambda x: binary_map.get(x, str(x)))
            
    history_cols = ['PetAllergy', 'FamilyHistoryAsthma', 'HistoryOfAllergies', 'Eczema', 'HayFever', 'GastroesophagealReflux']
    for col in history_cols:
        if col in df.columns:
            df[f'{col}_Label'] = df[col].apply(lambda x: binary_map.get(x, str(x)))
            
    return df

# -----------------------------------------------------------------------------
# 2.5 ML Model Training (XGBoost handling Unbalanced Data)
# -----------------------------------------------------------------------------
@st.cache_resource
def train_xgboost_model(df):
    features = [
        'Age', 'Gender', 'BMI', 'Smoking', 'PhysicalActivity', 'DietQuality', 'SleepQuality',
        'PollutionExposure', 'PollenExposure', 'DustExposure', 'PetAllergy', 'FamilyHistoryAsthma',
        'HistoryOfAllergies', 'Eczema', 'HayFever', 'GastroesophagealReflux', 'LungFunctionFEV1',
        'LungFunctionFVC', 'Wheezing', 'ShortnessOfBreath', 'ChestTightness', 'Coughing',
        'NighttimeSymptoms', 'ExerciseInduced'
    ]
    
    X = df[features].astype(float) 
    y = df['Diagnosis'].astype(int)
    
    num_neg = (y == 0).sum()
    num_pos = (y == 1).sum()
    scale_weight = num_neg / num_pos if num_pos > 0 else 1.0
    
    model = XGBClassifier(scale_pos_weight=scale_weight, random_state=42, eval_metric='logloss')
    model.fit(X, y)
    
    return model, features

# Load and train
try:
    df_global = load_and_clean_global_data()
    df_patient = load_and_clean_patient_data()
    xgb_model, trained_features = train_xgboost_model(df_patient)
except Exception as e:
    st.error(f"⚠️ Error loading files or training model! Details: {e}")
    st.stop()

# -----------------------------------------------------------------------------
# 3. Create Main Tabs Navigation
# -----------------------------------------------------------------------------
tab1, tab2, tab3 = st.tabs(["🌍 Global Dashboard", "👨‍⚕️ Patient Dashboard", "🔮 Predict Asthma"])

# =============================================================================
# TAB 1: Global Dashboard
# =============================================================================
with tab1:
    st.header("🌍 Global Asthma Analytics (GBD Data)")
    st.sidebar.markdown("### 🌍 Global Filters")
    
    measures = df_global['measure_name'].unique().tolist() if 'measure_name' in df_global.columns else []
    selected_measures = st.sidebar.multiselect("Select Measures", measures, default=measures[:1] if measures else None)
    
    metrics = df_global['metric_name'].unique().tolist() if 'metric_name' in df_global.columns else []
    selected_metrics = st.sidebar.multiselect("Select Metrics", metrics, default=metrics[:1] if metrics else None)
    
    df_g_filtered = df_global.copy()
    if selected_measures:
        df_g_filtered = df_g_filtered[df_g_filtered['measure_name'].isin(selected_measures)]
    if selected_metrics:
        df_g_filtered = df_g_filtered[df_g_filtered['metric_name'].isin(selected_metrics)]
        
    countries = sorted(df_g_filtered['location_name'].unique().tolist()) if 'location_name' in df_g_filtered.columns else []
    selected_countries = st.sidebar.multiselect("Select Countries for Trend Line", countries, default=countries[:1] if countries else None)

    st.subheader("📌 Key Performance Indicators")
    col1, col2, col3 = st.columns(3)
    
    if not df_g_filtered.empty:
        n_countries = df_g_filtered['location_name'].nunique() if 'location_name' in df_g_filtered.columns else 0
        max_year = int(df_g_filtered['year'].max()) if 'year' in df_g_filtered.columns else 0
        total_value = df_g_filtered['val'].sum() if 'val' in df_g_filtered.columns else 0
        
        col1.metric(label="Total Countries Available", value=f"{n_countries}")
        col2.metric(label="Latest Update Year", value=f"{max_year}")
        col3.metric(label="Total Current Value", value=f"{total_value:,.2f}")
    else:
        st.warning("No data matches the currently selected filters.")

    st.markdown("---")

    st.subheader("🗺️ Choropleth Map")
    if not df_g_filtered.empty and 'year' in df_g_filtered.columns:
        latest_y = df_g_filtered['year'].max()
        df_map = df_g_filtered[df_g_filtered['year'] == latest_y].groupby('location_name')['val_display'].mean().reset_index()
        measures_title = ", ".join(selected_measures) if selected_measures else "All Measures"
        fig_map = px.choropleth(
            df_map, locations="location_name", locationmode="country names", color="val_display",
            hover_name="location_name", title=f"Global Distribution of {measures_title} ({latest_y})",
            color_continuous_scale=["#FFF9B0", "#FFD966", "#FFB347", "#E67E22", "#B8860B"]
        )
        st.plotly_chart(fig_map, use_container_width=True)

    st.markdown("---")

    col_h, col_t = st.columns(2)
    with col_h:
        st.subheader("🔥 Heatmap (Age × Year)")
        if not df_g_filtered.empty and 'age_name' in df_g_filtered.columns and 'year' in df_g_filtered.columns:
            df_heat = df_g_filtered.groupby(['age_name', 'year'])['val'].mean().reset_index()
            df_pivot = df_heat.pivot(index='age_name', columns='year', values='val').fillna(0)
            fig_heat = px.imshow(df_pivot, labels=dict(x="Year", y="Age Group", color="Value"),
                                 title="Heatmap of Distribution over Years and Ages", color_continuous_scale='YlOrRd')
            st.plotly_chart(fig_heat, use_container_width=True)

    with col_t:
        st.subheader("📈 Trend Line (Country over Years)")
        if selected_countries and not df_g_filtered.empty:
            df_trend = df_g_filtered[df_g_filtered['location_name'].isin(selected_countries)].groupby(['year', 'location_name', 'sex_name'])['val'].mean().reset_index()
            fig_trend = px.line(df_trend, x='year', y='val', color='location_name', line_dash='sex_name', 
                                title="Asthma Trend Comparison", markers=True)
            st.plotly_chart(fig_trend, use_container_width=True)
        else:
            st.info("Please select at least one country to view the trend line.")

    st.markdown("---")

    col_b1, col_b2 = st.columns(2)
    with col_b1:
        st.subheader("📊 Horizontal Bar (Measure Comparison)")
        df_m_comp = df_global.copy()
        if selected_metrics:
            df_m_comp = df_m_comp[df_m_comp['metric_name'].isin(selected_metrics)]
        df_m_comp = df_m_comp.groupby('measure_name')['val'].mean().reset_index()
        fig_m_comp = px.bar(df_m_comp, x='val', y='measure_name', orientation='h', title="Average Value per Measure type", color='measure_name')
        st.plotly_chart(fig_m_comp, use_container_width=True)

    with col_b2:
        st.subheader("👥 Stacked Bar (Age × Sex)")
        if not df_g_filtered.empty:
            latest_y = df_g_filtered['year'].max()
            df_stack = df_g_filtered[df_g_filtered['year'] == latest_y].groupby(['age_name', 'sex_name'])['val'].mean().reset_index()
            fig_stack = px.bar(df_stack, x='age_name', y='val', color='sex_name', title=f"Age vs Sex Distribution ({latest_y})", barmode='stack')
            st.plotly_chart(fig_stack, use_container_width=True)

    st.markdown("---")

    col_e, col_top = st.columns(2)
    with col_e:
        st.subheader("📉 Error Bar (Confidence Interval)")
        if selected_countries and not df_g_filtered.empty and 'upper' in df_g_filtered.columns:
            primary_country = selected_countries[0]
            df_err = df_g_filtered[df_g_filtered['location_name'] == primary_country].groupby('year')[['val', 'upper', 'lower']].mean().reset_index()
            df_err['err_plus'] = df_err['upper'] - df_err['val']
            df_err['err_minus'] = df_err['val'] - df_err['lower']
            
            fig_err = go.Figure()
            fig_err.add_trace(go.Scatter(
                x=df_err['year'], y=df_err['val'],
                error_y=dict(type='data', symmetric=False, array=df_err['err_plus'], arrayminus=df_err['err_minus']),
                mode='lines+markers', name=f'Mean Value ({primary_country})'
            ))
            fig_err.update_layout(title=f"Confidence Intervals for {primary_country} over Years", xaxis_title="Year", yaxis_title="Value")
            st.plotly_chart(fig_err, use_container_width=True)
        else:
            st.info("Upper/lower columns are not available or no country selected.")

    with col_top:
        st.subheader("🏆 Top 10 Countries")
        if not df_g_filtered.empty:
            latest_y = df_g_filtered['year'].max()
            df_t10 = df_g_filtered[df_g_filtered['year'] == latest_y].groupby('location_name')['val'].mean().reset_index()
            df_t10 = df_t10.sort_values(by='val', ascending=False).head(10)
            fig_top = px.bar(df_t10, x='val', y='location_name', orientation='h', title=f"Top 10 Impacted Countries ({latest_y})", color='val', color_continuous_scale='Reds')
            fig_top.update_layout(yaxis={'categoryorder':'total ascending'})
            st.plotly_chart(fig_top, use_container_width=True)


# =============================================================================
# TAB 2: Patient Dashboard
# =============================================================================
with tab2:
    st.header("👨‍⚕️ Clinical Patient Dashboard")
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🎛️ Interactive Patient Cohort Filters")
    
    smoke_options = ["All Patients"] + df_patient['Smoking_Label'].unique().tolist()
    selected_smoke = st.sidebar.selectbox("Filter by Smoking Status", smoke_options)
    
    gender_options = ["All Patients"] + df_patient['Gender_Label'].unique().tolist()
    selected_gender = st.sidebar.selectbox("Filter by Gender", gender_options)
    
    min_age = int(df_patient['Age'].min())
    max_age = int(df_patient['Age'].max())
    selected_age_range = st.sidebar.slider("Filter by Age Range", min_age, max_age, (min_age, max_age))

    df_p_filtered = df_patient.copy()
    if selected_smoke != "All Patients":
        df_p_filtered = df_p_filtered[df_p_filtered['Smoking_Label'] == selected_smoke]
    if selected_gender != "All Patients":
        df_p_filtered = df_p_filtered[df_p_filtered['Gender_Label'] == selected_gender]
    df_p_filtered = df_p_filtered[(df_p_filtered['Age'] >= selected_age_range[0]) & (df_p_filtered['Age'] <= selected_age_range[1])]

    st.info(f"📊 Showing data for **{len(df_p_filtered)}** patients matching your sidebar selections.")

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 📊 Dynamic Visual Setup")
    categories = {
        "Demographics & Lifestyle": ["Age", "Gender_Label", "BMI", "Smoking_Label", "Ethnicity_Label", "EducationLevel_Label"],
        "Clinical Metrics": ["LungFunctionFEV1", "LungFunctionFVC"],
        "Symptoms (Yes/No)": ["Wheezing_Label", "ShortnessOfBreath_Label", "ChestTightness_Label", "Coughing_Label", "NighttimeSymptoms_Label", "ExerciseInduced_Label"],
        "Allergies & History": ["PetAllergy_Label", "FamilyHistoryAsthma_Label", "HistoryOfAllergies_Label", "Eczema_Label", "HayFever_Label", "GastroesophagealReflux_Label"]
    }
    selected_category = st.sidebar.selectbox("Select Patient Category", list(categories.keys()))
    selected_variable = st.sidebar.selectbox("Select Variable to Visualize", categories[selected_category])
    
    st.subheader(f"🔍 Dynamic Breakdown for Variable: `{selected_variable}`")
    
    if df_p_filtered.empty:
        st.error("❌ No patients match the current sidebar filter criteria.")
    else:
        if "Label" in selected_variable:
            col_pat1, col_pat2 = st.columns(2)
            with col_pat1:
                st.markdown("#### 🍩 Donut Chart (Distribution)")
                df_counts = df_p_filtered.groupby(selected_variable).size().reset_index(name='Count')
                fig_donut = px.pie(df_counts, names=selected_variable, values='Count', hole=0.4, title=f"Percentage of {selected_variable}")
                st.plotly_chart(fig_donut, use_container_width=True)
                
            with col_pat2:
                st.markdown("#### 📊 100% Stacked Bar (Variable vs Diagnosis)")
                if 'Diagnosis_Label' in df_p_filtered.columns:
                    df_p_stack = df_p_filtered.groupby([selected_variable, 'Diagnosis_Label']).size().reset_index(name='Count')
                    fig_p_stack = px.bar(df_p_stack, x=selected_variable, y='Count', color='Diagnosis_Label', barmode='stack', title=f"Proportion of Diagnosis across {selected_variable}")
                    st.plotly_chart(fig_p_stack, use_container_width=True)
        else:
            col_pat1, col_pat2 = st.columns(2)
            with col_pat1:
                st.markdown("#### 📊 Histogram")
                fig_p_hist = px.histogram(df_p_filtered, x=selected_variable, nbins=30, color_discrete_sequence=['teal'], title=f"Frequency Spectrum of {selected_variable}")
                st.plotly_chart(fig_p_hist, use_container_width=True)
                
            with col_pat2:
                st.markdown("#### 📦 Box Plot")
                fig_p_box = px.box(df_p_filtered, y=selected_variable, color_discrete_sequence=['coral'], title=f"Statistical Boxplot of {selected_variable}")
                st.plotly_chart(fig_p_box, use_container_width=True)

            st.markdown("---")
            st.markdown("#### 🎻 Violin Plot (Numeric vs Diagnosis)")
            if 'Diagnosis_Label' in df_p_filtered.columns:
                fig_violin = px.violin(df_p_filtered, x='Diagnosis_Label', y=selected_variable, color='Diagnosis_Label', box=True, points="all", title=f"{selected_variable} Distribution across Patient Status")
                st.plotly_chart(fig_violin, use_container_width=True)

        st.markdown("---")
        st.subheader("🧩 Advanced Clinical Fixed Visualizations")
        
        col_adv1, col_adv2 = st.columns(2)
        with col_adv1:
            st.markdown("#### 🔵 Lung Function Correlation: FEV1 vs FVC")
            if 'LungFunctionFEV1' in df_p_filtered.columns and 'LungFunctionFVC' in df_p_filtered.columns:
                fig_scatter = px.scatter(df_p_filtered, x='LungFunctionFEV1', y='LungFunctionFVC', color='Diagnosis_Label', opacity=0.6, title="FEV1 vs FVC Scatter Plot")
                st.plotly_chart(fig_scatter, use_container_width=True)
                
        with col_adv2:
            st.markdown("#### 🌀 Patient Demographics Hierarchy (Sunburst)")
            sunburst_path = ['Diagnosis_Label', 'Gender_Label', 'Smoking_Label']
            existing_sun_cols = [c for c in sunburst_path if c in df_p_filtered.columns]
            if len(existing_sun_cols) > 1:
                fig_sunburst = px.sunburst(df_p_filtered, path=existing_sun_cols, color='Diagnosis_Label',
                                           color_discrete_map={'Healthy': '#2b5c8f', 'Asthma': '#e05a47'})
                st.plotly_chart(fig_sunburst, use_container_width=True)

        st.markdown("---")
        st.markdown("#### 🧮 Full Feature Correlation Matrix with Target Diagnosis")
        st.markdown("> **Fixed Comprehensive Correlation Analysis:** This matrix is calculated using the full patient records dataset to avoid layout breakage or missing columns when narrow filters are chosen.")
        
        comprehensive_features = [
            'Age', 'Gender', 'BMI', 'Smoking', 'PhysicalActivity', 'DietQuality', 'SleepQuality',
            'PollutionExposure', 'PollenExposure', 'DustExposure', 'PetAllergy', 'FamilyHistoryAsthma',
            'HistoryOfAllergies', 'Eczema', 'HayFever', 'GastroesophagealReflux', 'LungFunctionFEV1', 'LungFunctionFVC',
            'Wheezing', 'ShortnessOfBreath', 'ChestTightness', 'Coughing', 'NighttimeSymptoms', 'ExerciseInduced', 'Diagnosis'
        ]
        existing_all_features = [c for c in comprehensive_features if c in df_patient.columns]
        
        if len(existing_all_features) > 1:
            df_full_corr = df_patient[existing_all_features].corr(method='spearman')
            fig_full_heatmap = px.imshow(df_full_corr, text_auto=".2f", color_continuous_scale='RdBu_r', aspect='auto', title="Global Relationships Matrix (All Clinical & Lifestyle Attributes vs Diagnosis)")
            fig_full_heatmap.update_layout(width=1100, height=850, xaxis_tickangle=-45)
            st.plotly_chart(fig_full_heatmap, use_container_width=True)


# =============================================================================
# TAB 3: Predict Asthma (Fully Transformed to English)
# =============================================================================
with tab3:
    st.header("🔮 AI Patient Diagnosis Predictor")
    st.markdown("Input patient clinical and lifestyle metrics below to predict the probability of **Asthma** using the XGBoost model.")
    st.warning("⚠️ Note: This model is trained with automatic class-weight balancing (`scale_pos_weight`) to handle unbalanced datasets accurately.")
    st.subheader("📋 Patient Metrics Input Form")
    
    with st.form("prediction_form"):
        col_in1, col_in2, col_in3 = st.columns(3)
        
        with col_in1:
            st.markdown("#### 👥 Demographics & Lifestyle")
            age = st.slider("Age", 5, 80, 30)
            gender = st.selectbox("Gender", ["Male", "Female"])
            gender_val = 0 if gender == "Male" else 1
            bmi = st.number_input("Body Mass Index (BMI)", min_value=10.0, max_value=50.0, value=22.5)
            smoking = st.selectbox("Smoking Status", ["No", "Yes"])
            smoking_val = 1 if smoking == "Yes" else 0
            
        with col_in2:
            st.markdown("#### 🧪 Environment & Quality of Life")
            phys_act = st.slider("Physical Activity Score (0-10)", 0.0, 10.0, 5.0)
            diet_qual = st.slider("Diet Quality Score (0-10)", 0.0, 10.0, 5.0)
            sleep_qual = st.slider("Sleep Quality Score (0-10)", 0.0, 10.0, 7.0)
            pollution = st.slider("Pollution Exposure (0-10)", 0.0, 10.0, 3.0)
            pollen = st.slider("Pollen Exposure (0-10)", 0.0, 10.0, 2.0)
            dust = st.slider("Dust Exposure (0-10)", 0.0, 10.0, 2.0)

        with col_in3:
            st.markdown("#### 🫁 Lung Function Clinical Metrics")
            fev1 = st.number_input("Lung Function FEV1", min_value=1.0, max_value=6.0, value=3.0)
            fvc = st.number_input("Lung Function FVC", min_value=1.5, max_value=7.0, value=4.0)
            
        st.markdown("---")
        col_in4, col_in5 = st.columns(2)
        
        with col_in4:
            st.markdown("#### 🤧 Current Clinical Symptoms")
            wheezing = st.checkbox("Wheezing")
            short_breath = st.checkbox("Shortness Of Breath")
            chest_tight = st.checkbox("Chest Tightness")
            coughing = st.checkbox("Coughing")
            night_sym = st.checkbox("Nighttime Symptoms")
            exercise_ind = st.checkbox("Exercise Induced Symptoms")

        with col_in5:
            st.markdown("#### 🧬 Medical History & Allergies")
            pet_allergy = st.checkbox("Pet Allergy")
            fam_asthma = st.checkbox("Family History of Asthma")
            hist_allergy = st.checkbox("General History of Allergies")
            eczema = st.checkbox("Eczema")
            hay_fever = st.checkbox("Hay Fever")
            gerd = st.checkbox("Gastroesophageal Reflux (GERD)")

        submit_btn = st.form_submit_button("🎯 Run Clinical Diagnosis")
        
    if submit_btn:
        raw_input = {
            'Age': float(age), 'Gender': float(gender_val), 'BMI': float(bmi), 'Smoking': float(smoking_val),
            'PhysicalActivity': float(phys_act), 'DietQuality': float(diet_qual), 'SleepQuality': float(sleep_qual),
            'PollutionExposure': float(pollution), 'PollenExposure': float(pollen), 'DustExposure': float(dust),
            'PetAllergy': float(int(pet_allergy)), 'FamilyHistoryAsthma': float(int(fam_asthma)),
            'HistoryOfAllergies': float(int(hist_allergy)), 'Eczema': float(int(eczema)), 'HayFever': float(int(hay_fever)),
            'GastroesophagealReflux': float(int(gerd)), 'LungFunctionFEV1': float(fev1), 'LungFunctionFVC': float(fvc),
            'Wheezing': float(int(wheezing)), 'ShortnessOfBreath': float(int(short_breath)), 'ChestTightness': float(int(chest_tight)),
            'Coughing': float(int(coughing)), 'NighttimeSymptoms': float(int(night_sym)), 'ExerciseInduced': float(int(exercise_ind))
        }
        
        # Enforcing identical feature order matching the training scheme
        input_data = pd.DataFrame([raw_input])[trained_features]
        
        prediction = xgb_model.predict(input_data)[0]
        probability = xgb_model.predict_proba(input_data)[0][1] * 100
        
        st.markdown("### 📊 AI Diagnostic Prediction Result:")
        if prediction == 1:
            st.error(f"🚨 **Predicted Classification:** Positive / Asthma Case Detected")
            st.progress(int(probability))
            st.write(f"📈 Model Confidence / Probability Matrix: **{probability:.2f}%**")
        else:
            st.success(f"✅ **Predicted Classification:** Negative / Healthy Patient")
            st.progress(int(100 - probability))
            st.write(f"📈 Model Confidence / Probability Matrix: **{(100 - probability):.2f}%**")